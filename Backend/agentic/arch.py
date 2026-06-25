from langchain_anthropic import ChatAnthropic
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
import subprocess
import tempfile
import os
import json
from dotenv import load_dotenv

load_dotenv()

# === LLM SETUP ===
llm = ChatAnthropic(model="claude-3-5-haiku-20241022", temperature=0.05, api_key=os.getenv("SK_ANT_API_KEY"), max_tokens=2500)

tailwind = "/^(bg|text|border)-(red|green|blue|gray|yellow|purple|pink|indigo|emerald|amber|slate|neutral)-(400|500|600)$/, variants: ['hover', 'dark', 'md'],  /^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-(0|1|2|4|6|8|10|12|16)$/,/^(w|h|min-w|max-w|min-h|max-h)-(full|screen|0|1|2|4|8|16|24|32|64|96)$/, /^(text)-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/, pattern: /^font-(bold|semibold)$/, 'flex', 'inline-flex', 'grid', 'block', 'hidden', 'absolute', 'relative', 'fixed', 'sticky', /^grid-cols-(1|2|3|4|5|6|12)$/, /^(justify|items|self)-(start|center|end|between|around)$/, /^(rounded|rounded-[trbl]{1,2})-(sm|md|lg|xl|full)$/, /^shadow(-(sm|md|lg|xl|2xl))?$/, /^animate-.+$/,  /^(transition|duration|ease|delay)-(75|100|150|200|300)$/, /^(ring|outline)-(0|1|2|4|offset|none)$/, /^focus:ring-(0|1|2|4|8|indigo-\d{3})$/, /^focus:ring-opacity-(25|50|75|100)$/, /^(z|overflow)-(auto|hidden|visible|scroll|0|10|20|30|40|50)$/,'text-center'"

# === AGENT PROMPTS ===
planner_prompt = PromptTemplate(
    input_variables=["prompt"],
    template="You are a senior React architect. Given this prompt, write a simple natural language description of the app and the responsibilities of each file (no code, no JSON, just a clear, VERY CONCISE, and complete description). Start from App.js. Do not output any code or JSON. STICK TO 100 WORDS, we are using tailwind.\n{prompt}"
)
planner_chain = LLMChain(llm=llm, prompt=planner_prompt)

file_codegen_prompt = PromptTemplate(
    input_variables=["plan"],
    template=(
        "You are a senior React developer. Given the following app description and file responsibilities make really aesthetic tailwind pages with appropriate padding"
        "generate the full code for ALL files described. "
        "KEEP IT WITHIN 1000 TOKENS, use ONLY tailwind STATIC classnames"
        "For any grid, board, or collection of square/cell UI elements, ensure each cell or button has a fixed width and height using appropriate Tailwind classes, so that empty cells do not collapse and the layout remains consistent. and force UI to wmax hmax and TAKE UP ENTIRE SCREEN "
        "IMPORTANT: Do NOT use react-router-dom or any external routing libraries. Use simple state-based navigation or basic conditional rendering instead. "
        "ONLY RETURN A VALID JSON OBJECT where each key is a filename and its value is the code string. "
        "DO NOT return any extra text, newlines, or backticks.\n\n"
        "App description and file responsibilities:\n{plan}\n"
        "Do NOT invent new props or functions. If a prop or function is needed, ensure it is defined and passed correctly. DO NOT ADD DIRECTORIES LIKE UTILS OR COMPONENTS\n"
        "Example output format:\n"
        "{{\n  \"App.js\": \"// code here\",\n  \"Component1.js\": \"// code here\",\n  \"Component2.js\": \"// code here\"\n}}"
    )
)
file_codegen_chain = LLMChain(llm=llm, prompt=file_codegen_prompt)

refiner_prompt = PromptTemplate(
    input_variables=["refine_prompt", "files_dict"],
    template="You are a senior React refactoring agent. Given a refinement prompt and the current codebase, decide if a full replan is needed or just local edits. Output ONLY JSON: {{\"action\": \"replan\" | \"edit\", \"edits\": {{filename: new_code}} }}.\n\nIMPORTANT: If the error mentions 'Could not resolve' for a package like 'react-router-dom', 'react', or 'react-dom', this is an external dependency issue. Do NOT try to add package.json files. Instead, either:\n1. Remove the problematic import and use simpler alternatives (e.g., replace react-router-dom with simple state-based navigation)\n2. Or keep the import if it's essential (the validator will be updated to handle it)\n\nRefinement: {refine_prompt}\nCurrent files: {files_dict}"
)
refiner_chain = LLMChain(llm=llm, prompt=refiner_prompt)

# === VALIDATOR ===
def validate_jsx_with_esbuild_bundle(files_dict, entry="App.js"):
    with tempfile.TemporaryDirectory() as tempdir:
        for fname, code in files_dict.items():
            file_path = os.path.join(tempdir, fname)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w") as f:
                f.write(code)
        try:
            result = subprocess.run(
                [
                    "node",
                    os.path.join(os.path.dirname(__file__), "esbuild_validate.js"),
                    os.path.join(tempdir, entry)
                ],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=tempdir
            )
            return {"valid": result.returncode == 0, "error": result.stderr if result.returncode else None}
        except Exception as e:
            return {"valid": False, "error": str(e)}

def validator_agent(files_dict, entry="App.js"):
    print("[Validator] Input files_dict:", files_dict)
    result = validate_jsx_with_esbuild_bundle(files_dict, entry=entry)
    print(f"[Validator] Bundle result: {result}")
    return {"valid": result["valid"], "files": files_dict if result["valid"] else None, "error": result.get("error")}

# === CODEGEN FOR ALL FILES WITH NATURAL LANGUAGE PLAN ===
def generate_code_files_from_plan(plan_nl):
    print(f"[CodeGen] Generating all files at once")
    try:
        code_result = file_codegen_chain.run(plan=plan_nl)
        files = json.loads(code_result)
    except Exception as e:
        print(f"[CodeGen] Failed to generate files: {e}")
        return {"error": f"Codegen error: {e}", "raw": code_result}
    return files

# === PIPELINE ===
def agentic_pipeline(user_prompt, refine_prompt=None, files_dict=None, depth=0, max_depth=3):
    if depth >= max_depth:
        return {"error": "Refinement loop exceeded"}

    if not files_dict:
        # 1. Plan
        print("[Planner] Input prompt:", user_prompt)
        try:
            plan_nl = planner_chain.run(prompt=user_prompt).strip()
        except Exception as e:
            return {"error": f"Planner error or malformed output: {e}", "raw": "No plan generated"}

        print("[Planner] Parsed plan:", plan_nl)

        # 2. Generate Code
        files = generate_code_files_from_plan(plan_nl)
        if isinstance(files, dict) and "error" in files:
            return files
    else:
        # Use existing files for refinement
        print("[Pipeline] Using existing files, skipping planning and code generation")
        files = files_dict

    # 3. Validate
    entry = "App.js"
    validation = not refine_prompt and validator_agent(files, entry=entry)

    if validation and validation["valid"]:
        return validation["files"]

    refine_prompt = refine_prompt or  f"Validation failed with error: {validation['error']}"

    # 4. Refine if needed
    if refine_prompt:
        print("[Refiner] Starting refinement", refine_prompt)
        try:
            refine_result = refiner_chain.run(refine_prompt=refine_prompt, files_dict=files)
            refine_decision = json.loads(refine_result)
        except Exception as e:
            return {"error": f"Refiner JSON error: {e}", "raw": refine_result}
        
        print("[Refiner] Refinement:", refine_decision)

        if refine_decision.get("action") == "replan":
            return agentic_pipeline(refine_prompt, "", files, depth+1, max_depth)
        elif refine_decision.get("action") == "edit":
            edited_files = files.copy()
            edited_files.update(refine_decision.get("edits", {}))
            validation_result = validator_agent(edited_files, entry=entry)
            if validation_result["valid"]:
                return validation_result["files"]
            else:
                return validation_result
        else:
            return {"error": "Unknown refinement action"}
    else:
        return validation

