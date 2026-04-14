import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-primary-foreground hover:bg-gradient-to-r hover:from-indigo-700 hover:to-violet-700 shadow-sm hover:shadow-md',
        destructive: 'bg-red-600 text-destructive-foreground hover:bg-red-700 shadow-sm',
        outline: 'border border-slate-200 bg-background hover:bg-slate-100 hover:text-slate-900',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        ghost: 'hover:bg-slate-100 hover:text-slate-900',
        link: 'text-indigo-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        iconSm: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
