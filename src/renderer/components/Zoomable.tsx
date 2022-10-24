import panzoom, { PanZoom } from 'panzoom';
import { DetailedHTMLProps, HTMLAttributes, useEffect, useRef } from 'react';

interface IZoomableExtra {
  setPanZoom: (p: PanZoom) => void;
  onSerializePanZoom: () => void;
}

type TZoomable = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> &
  IZoomableExtra;

const defaultPanZoomTransform = { scale: 0.5, x: 0, y: 0 };
const defaultPanZoomSettings = { transform: defaultPanZoomTransform };

const Zoomable = ({ children, setPanZoom, onSerializePanZoom }: TZoomable) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current != null) {
      const instance = panzoom(divRef.current, {
        initialZoom: defaultPanZoomTransform.scale,
        enableTextSelection: true,
        filterKey: () => true,
        beforeWheel(e) {
          // Only allow ctrl + scroll (or pinch on macos)
          if (e.ctrlKey) {
            return false;
          }
          return true;
        },
        beforeMouseDown(e) {
          if (e.metaKey) {
            return false;
          }
          return true;
        },
        zoomDoubleClickSpeed: 1,
      });

      setPanZoom(instance);

      instance.on('zoom', () => {
        onSerializePanZoom();
      });

      instance.on('pan', () => {
        onSerializePanZoom();
      });
    }
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        position: 'relative',
      }}
      // maxZoom={0.2}
    >
      {children}
    </div>
  );
};

export { Zoomable, defaultPanZoomTransform, defaultPanZoomSettings };
