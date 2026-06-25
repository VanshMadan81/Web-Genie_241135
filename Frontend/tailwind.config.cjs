/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    // Color utilities (commonly used only, and only mid-range shades)
    {
      pattern: /^(bg|text|border)-(red|green|blue|gray|yellow|purple|pink|indigo|emerald|amber|slate|neutral)-(400|500|600)$/,
      variants: ['hover', 'dark', 'md'],
    },

    // Spacing utilities (just common powers of 2)
    {
      pattern: /^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-(0|1|2|4|6|8|10|12|16)$/,
    },

    // Width and height (commonly used)
    {
      pattern: /^(w|h|min-w|max-w|min-h|max-h)-(full|screen|0|1|2|4|8|16|24|32|64|96)$/,
    },

    // Text & font size
    {
      pattern: /^(text)-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/,
    },

    // Font weight
    {
      pattern: /^font-(bold|semibold)$/,
    },

    // Display, flex/grid, and positioning
    'flex', 'inline-flex', 'grid', 'block', 'hidden',
    'absolute', 'relative', 'fixed', 'sticky',

    // Grid column count
    {
      pattern: /^grid-cols-(1|2|3|4|5|6|12)$/,
    },

    // Justify & align
    {
      pattern: /^(justify|items|self)-(start|center|end|between|around)$/,
    },

    // Border radius & shadow
    {
      pattern: /^(rounded|rounded-[trbl]{1,2})-(sm|md|lg|xl|full)$/,
    },
    {
      pattern: /^shadow(-(sm|md|lg|xl|2xl))?$/,
    },

    // Animations
    {
      pattern: /^animate-.+$/,
    },

    // // Transitions
    // 'transition-colors',
    // {
    //   pattern: /^(transition|duration|ease|delay)-(75|100|150|200|300)$/,
    // },

    // Ring and outline (interactive)
    {
      pattern: /^(ring|outline)-(0|1|2|4|offset|none)$/,
    },
    {
      pattern: /^focus:ring-(0|1|2|4|8|indigo-\d{3})$/,
    },
    {
      pattern: /^focus:ring-opacity-(25|50|75|100)$/,
    },

    // Z-index and overflow
    {
      pattern: /^(z|overflow)-(auto|hidden|visible|scroll|0|10|20|30|40|50)$/,
    },

    // Text alignment
    'text-center',
  ],
  theme: {
    extend: {
      keyframes: {
        'pulse-line': {
          '0%, 100%': { transform: 'scaleX(0)', transformOrigin: 'center' },
          '50%': { transform: 'scaleX(1)', transformOrigin: 'center' },
        },
      },
      animation: {
        'pulse-line': 'pulse-line 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
