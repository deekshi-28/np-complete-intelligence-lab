
class ExecutionRecorder:
    """
    Records algorithm execution events for
    state-space visualization and analysis.
    """

    def __init__(self, max_events: int = 5000):

        self.max_events = max_events
        self.events = []

        self.next_state_id = 0
        self.events_truncated = False

    def create_state_id(self):
        state_id = self.next_state_id
        self.next_state_id += 1
        return state_id

    def record(
        self,
        state_id,
        parent_id,
        depth,
        event_type,
        decision=None,
        status=None,
        reason=None,
        state=None
    ):

        if len(self.events) >= self.max_events:
            self.events_truncated = True
            return

        event = {
            "event_id": len(self.events) + 1,
            "state_id": state_id,
            "parent_id": parent_id,
            "depth": depth,
            "event_type": event_type,
            "decision": decision,
            "status": status,
            "reason": reason,
            "state": state
        }

        self.events.append(event)

    def get_events(self):
        return self.events
