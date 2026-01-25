import { Composition, Folder } from "remotion";
import { Version1StuckMoment } from "./versions/Version1StuckMoment";
import { Version2TheMath } from "./versions/Version2TheMath";
import { Version3TheDemo } from "./versions/Version3TheDemo";
import { Version4SpeedRun } from "./versions/Version4SpeedRun";
import { Version5RealDemo } from "./versions/Version5RealDemo";
import { Version6LiveDemo } from "./versions/Version6LiveDemo";

export const RemotionRoot = () => {
  return (
    <Folder name="Polydev-Intro">
      <Composition
        id="Version1-StuckMoment"
        component={Version1StuckMoment}
        durationInFrames={30 * 30} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Version2-TheMath"
        component={Version2TheMath}
        durationInFrames={25 * 30} // 25 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Version3-TheDemo"
        component={Version3TheDemo}
        durationInFrames={45 * 30} // 45 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Version4-SpeedRun"
        component={Version4SpeedRun}
        durationInFrames={15 * 30} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Version5-RealDemo"
        component={Version5RealDemo}
        durationInFrames={50 * 30} // 50 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Version6-LiveDemo"
        component={Version6LiveDemo}
        durationInFrames={45 * 30} // 45 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </Folder>
  );
};
