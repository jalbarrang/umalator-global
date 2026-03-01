import { useRaceTrack } from '../context/RaceTrackContext';

export const MouseLine = () => {
  const { mouseLineRef, mouseTextRef } = useRaceTrack();

  return (
    <>
      <line
        ref={mouseLineRef}
        className="mouseoverLine"
        x1="-5"
        y1="0"
        x2="-5"
        y2="100%"
        stroke="rgb(121,64,22)"
        strokeWidth="2"
        pointerEvents="none"
      />
      <text
        ref={mouseTextRef}
        className="mouseoverText"
        x="-5"
        y="-5"
        fill="rgb(121,64,22)"
        pointerEvents="none"
      />
    </>
  );
};
