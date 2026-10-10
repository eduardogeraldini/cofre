import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-none hover:-translate-y-px hover:bg-primary-hover hover:shadow-[0_4px_12px_rgba(99,102,241,0.35)] active:translate-y-0 active:shadow-none",
        outline:
          "border-border bg-transparent text-foreground hover:-translate-y-px hover:border-foreground/25 hover:bg-muted/60 aria-expanded:bg-muted aria-expanded:text-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:-translate-y-px hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "border-destructive/40 bg-transparent text-destructive hover:-translate-y-px hover:border-destructive hover:bg-destructive/10 focus-visible:border-destructive/50 focus-visible:ring-destructive/20",
        secondary:
          "bg-muted text-foreground hover:-translate-y-px hover:bg-muted/70",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 rounded-[4px] px-2.5 text-xs",
        sm: "h-8 px-3",
        default: "h-[38px] px-4",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-[38px] px-0",
        "icon-sm": "size-8 px-0",
        "icon-xs": "size-7 px-0",
        "icon-lg": "size-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
