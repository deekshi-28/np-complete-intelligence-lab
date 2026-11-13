
import { useEffect, useRef, useState } from "react";
import {
  CirclePause,
  CirclePlay,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function ExecutionPlayback({
  events = [],
  currentStep = 0,
  onStepChange,
  disabled = false,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const currentStepRef = useRef(currentStep);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    if (!isPlaying || events.length === 0 || disabled) {
      return;
    }

    const interval = setInterval(() => {
      const nextStep = currentStepRef.current + 1;

      if (nextStep >= events.length) {
        setIsPlaying(false);
        return;
      }

      currentStepRef.current = nextStep;
      onStepChange?.(nextStep);
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPlaying, speed, events.length, disabled, onStepChange]);

  useEffect(() => {
    if (currentStep >= events.length - 1) {
      setIsPlaying(false);
    }
  }, [currentStep, events.length]);

  function selectStep(step) {
    const boundedStep = Math.max(
      0,
      Math.min(step, events.length - 1)
    );

    currentStepRef.current = boundedStep;
    onStepChange?.(boundedStep);
  }

  function togglePlayback() {
    if (events.length === 0 || disabled) return;

    if (currentStep >= events.length - 1) {
      selectStep(0);
    }

    setIsPlaying((previous) => !previous);
  }

  return (
    <div className="ep-container">
      <div className="ep-controls">
        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            selectStep(0);
          }}
          disabled={disabled || events.length === 0}
          title="First event"
        >
          <SkipBack size={17} />
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            selectStep(currentStep - 1);
          }}
          disabled={disabled || currentStep <= 0}
          title="Previous event"
        >
          <ChevronLeft size={19} />
        </button>

        <button
          type="button"
          className="ep-play-button"
          onClick={togglePlayback}
          disabled={disabled || events.length === 0}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <CirclePause size={22} />
          ) : (
            <CirclePlay size={22} />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            selectStep(currentStep + 1);
          }}
          disabled={
            disabled || currentStep >= events.length - 1
          }
          title="Next event"
        >
          <ChevronRight size={19} />
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            selectStep(events.length - 1);
          }}
          disabled={disabled || events.length === 0}
          title="Last event"
        >
          <SkipForward size={17} />
        </button>
      </div>

      <div className="ep-progress">
        <input
          type="range"
          min="0"
          max={Math.max(0, events.length - 1)}
          value={Math.min(currentStep, Math.max(0, events.length - 1))}
          onChange={(event) => {
            setIsPlaying(false);
            selectStep(Number(event.target.value));
          }}
          disabled={disabled || events.length === 0}
        />

        <div className="ep-progress-info">
          <span>
            Event {events.length ? currentStep + 1 : 0}
          </span>
          <span>{events.length} total events</span>
        </div>
      </div>

      <div className="ep-speed">
        <label htmlFor="ep-speed-select">Playback speed</label>

        <select
          id="ep-speed-select"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="4">4x</option>
        </select>
      </div>
    </div>
  );
}
