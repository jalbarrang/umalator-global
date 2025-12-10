import './Tooltip.css';

type TooltipProps = React.HTMLAttributes<HTMLDivElement> & {
  tall?: string;
  title: string;
};

export function Tooltip(props: TooltipProps) {
  const { tall, children, title } = props;

  return (
    <div className={`hasTooltip${tall ? ' contentIsTall' : ''}`}>
      {children}
      <div className="tooltip">
        {title}
        <span className="arrow" />
      </div>
    </div>
  );
}
