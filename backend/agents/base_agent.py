class BaseAgent:
    def __init__(self, name: str):
        self.name = name
        self.run_count = 0

    def run(self, context: dict) -> dict:
        raise NotImplementedError(f"Agent '{self.name}' must implement run().")

    def log(self, message: str):
        print(f"[{self.name}] {message}")

    def __repr__(self):
        return f"<Agent: {self.name} | Cycles run: {self.run_count}>"
