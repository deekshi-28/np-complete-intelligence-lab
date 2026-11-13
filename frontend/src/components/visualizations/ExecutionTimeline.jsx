
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";

import { EVENT_COLORS } from "./eventUtils";

export default function ExecutionTimeline({
  events = [],
  currentStep = 0,
  onStepChange,
}) {
  const selectedEvent = events[currentStep];

  const eventCounts = useMemo(() => {
    return events.reduce((counts, event) => {
      const type = event.event_type || "UNKNOWN";
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="etl-empty">
        No execution events available. Run an algorithm first.
      </div>
    );
  }

  return (
    <div className="etl-container">
      <div className="etl-header">
        <div>
          <h3>Execution Timeline</h3>
          <p>Inspect the sequence of backtracking events.</p>
        </div>

        <span className="etl-total">
          {events.length} events
        </span>
      </div>

      <div className="etl-summary">
        {Object.entries(eventCounts).map(([type, count]) => (
          <div className="etl-summary-item" key={type}>
            <span
              className="etl-summary-dot"
              style={{
                background: EVENT_COLORS[type] || "#64748b",
              }}
            />

            <span>{type}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>

      <div className="etl-selected">
        <span>Selected event</span>

        <strong>
          {selectedEvent?.event_type || "None"}
        </strong>

        <span>
          {selectedEvent?.decision || "No decision information"}
        </span>

        {selectedEvent?.reason && (
          <p>{selectedEvent.reason}</p>
        )}
      </div>

      <div className="etl-event-list">
        {events.map((event, index) => {
          const type = event.event_type || "UNKNOWN";
          const isActive = index === currentStep;
          const color = EVENT_COLORS[type] || "#64748b";

          return (
            <button
              type="button"
              key={`${event.event_id ?? index}-${index}`}
              className={`etl-event-row ${
                isActive ? "active" : ""
              }`}
              onClick={() => onStepChange?.(index)}
            >
              <span className="etl-event-number">
                {event.event_id ?? index + 1}
              </span>

              <span
                className="etl-event-dot"
                style={{ background: color }}
              />

              <span className="etl-event-details">
                <strong>{type}</strong>

                <span>
                  {event.decision || "Search state"}
                </span>
              </span>

              <span className="etl-event-depth">
                Depth {event.depth ?? 0}
              </span>

              {isActive && (
                <span className="etl-active-label">
                  Current
                </span>
              )}

              <ChevronRight size={15} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
