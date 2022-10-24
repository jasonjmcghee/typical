import { MutableRefObject, useRef, useState } from 'react';

function useRefState<T>(
  defaultValue: T
): [T, (v: T) => void, MutableRefObject<T>] {
  const [val, setVal] = useState<T>(defaultValue);
  const valRef = useRef<T>(val);
  return [
    val,
    (v: T) => {
      valRef.current = v;
      setVal(valRef.current);
    },
    valRef,
  ];
}

export { useRefState };
