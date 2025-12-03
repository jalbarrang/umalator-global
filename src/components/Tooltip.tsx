import './Tooltip.css';

export function Tooltip(props) {
  return (
    <div className={`hasTooltip${props.tall ? ' contentIsTall' : ''}`}>
      {props.children}
      <div className="tooltip">
        {props.title}
        <span className="arrow" />
      </div>
    </div>
  );
}
