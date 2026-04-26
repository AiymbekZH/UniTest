import { forwardRef } from 'react';

const VARIANT_CLASSES = {
  primary: 'chunky-btn-primary',
  dark: 'chunky-btn-dark',
  ghost: 'chunky-btn-ghost',
  secondary: 'chunky-btn-ghost',
  danger: 'chunky-btn-danger',
  success: 'chunky-btn-success',
  amber: 'chunky-btn-amber'
};

const SIZE_CLASSES = {
  sm: 'text-xs px-4 py-2 rounded-2xl',
  md: 'text-sm px-5 py-3',
  lg: 'text-base px-6 py-4',
  xl: 'text-lg px-7 py-5',
  icon: 'h-11 w-11 p-0 rounded-2xl'
};

/**
 * Chunky playful button with hard bottom shadow + press-down animation.
 * Accessibility: native button; min touch target enforced via touch-target.
 */
const ChunkyButton = forwardRef(function ChunkyButton(
  {
    as: Tag = 'button',
    variant = 'primary',
    size = 'md',
    full = false,
    loading = false,
    icon = null,
    iconAfter = null,
    className = '',
    children,
    disabled,
    ...props
  },
  ref
) {
  const variantCls = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const sizeCls = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const widthCls = full ? 'w-full' : '';

  return (
    <Tag
      ref={ref}
      disabled={loading || disabled}
      className={`${variantCls} ${sizeCls} ${widthCls} touch-target ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icon}
      {children}
      {!loading && iconAfter ? iconAfter : null}
    </Tag>
  );
});

export default ChunkyButton;
