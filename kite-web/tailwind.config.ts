import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			// Flow node category colors, mirrored from src/lib/flow/nodes.ts so the
  			// marketing home speaks the exact same visual language as the editor.
  			node: {
  				entry: '#eab308',
  				action: '#3b82f6',
  				control: '#22c55e',
  				option: '#8b5cf6',
  				suspend: '#d946ef',
  				integration: '#06b6d4',
  				error: '#ef4444'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			shake: {
  				'10%, 90%': {
  					transform: 'translate3d(-1px, 0, 0)'
  				},
  				'20%, 80%': {
  					transform: 'translate3d(2px, 0, 0)'
  				},
  				'30%, 50%, 70%': {
  					transform: 'translate3d(-4px, 0, 0)'
  				},
  				'40%, 60%': {
  					transform: 'translate3d(4px, 0, 0)'
  				}
  			},
  			'home-float': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-10px)' }
  			},
  			'home-glow': {
  				'0%, 100%': { opacity: '0.45' },
  				'50%': { opacity: '0.85' }
  			},
  			'home-dash': {
  				to: { 'stroke-dashoffset': '-16' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			shake: 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
  			'home-float': 'home-float 6s ease-in-out infinite',
  			'home-glow': 'home-glow 5s ease-in-out infinite',
  			'home-dash': 'home-dash 0.7s linear infinite'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
                    ...fontFamily.sans
                ],
  			display: ['var(--font-display)', 'var(--font-sans)', ...fontFamily.sans],
  			mono: ['var(--font-mono)', ...fontFamily.mono]
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;
