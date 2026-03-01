import type { PropsWithChildren } from 'react';
import { useRaceTrack } from '../context/RaceTrackContext';
import { VelocityPaths } from '../overlays/velocity-paths';
import { ThresholdMarkers } from '../overlays/threshold-markers';
import { PosKeepLabels } from '../overlays/poskeep-labels';
import { RaceTrackTooltip } from '../overlays/racetrack-tooltip';
import { MouseLine } from '../overlays/mouse-line';

type RaceTrackRenderProps = React.SVGProps<SVGSVGElement>;

export const RaceTrackRender = ({
  children,
  ...props
}: PropsWithChildren<RaceTrackRenderProps>) => {
  const {
    courseid,
    width,
    height,
    courseDistance,
    mouseLineRef,
    mouseTextRef,
    rtMouseMove,
    rtMouseLeave,
    draggedSkill,
    handleDragMove,
    handleDragEnd,
  } = useRaceTrack();

  const doMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const svg = e.currentTarget;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(ctm.inverse());

    if (svgPoint.x < 0) return;

    const x = svgPoint.x;
    const y = svgPoint.y;

    if (mouseLineRef.current) {
      mouseLineRef.current.setAttribute('x1', x.toString());
      mouseLineRef.current.setAttribute('x2', x.toString());
    }
    if (mouseTextRef.current) {
      mouseTextRef.current.setAttribute('x', (x > width - 45 ? x - 45 : x + 5).toString());
      mouseTextRef.current.setAttribute('y', y.toString());
      mouseTextRef.current.textContent = Math.round((x / width) * courseDistance) + 'm';
    }

    rtMouseMove(x / width);

    if (draggedSkill) {
      handleDragMove(e);
    }
  };

  const doMouseLeave = () => {
    if (mouseLineRef.current) {
      mouseLineRef.current.setAttribute('x1', '-5');
      mouseLineRef.current.setAttribute('x2', '-5');
    }
    if (mouseTextRef.current) {
      mouseTextRef.current.setAttribute('x', '-5');
      mouseTextRef.current.setAttribute('y', '-5');
      mouseTextRef.current.textContent = '';
    }
    rtMouseLeave();
    handleDragEnd();
  };

  return (
    <div className="flex flex-1 justify-center">
      <div className="flex flex-col w-full max-w-[1200px]">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="racetrackView w-full flex-1"
          data-courseid={courseid}
          onMouseMove={doMouseMove}
          onMouseLeave={doMouseLeave}
          onMouseUp={handleDragEnd}
          {...props}
        >
          {children}

          <g id="racetrack-overlays">
            <VelocityPaths />
            <ThresholdMarkers />
            <PosKeepLabels />
            <RaceTrackTooltip />
            <MouseLine />
          </g>
        </svg>
      </div>
    </div>
  );
};
