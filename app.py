import threading
import time
import random
import json
from flask import Flask, render_template, Response, jsonify, request
from enum import Enum
import queue

app = Flask(__name__)

class State(Enum):
    THINKING = "thinking"
    HUNGRY = "hungry"
    EATING = "eating"

class DiningSimulation:
    def __init__(self, n=5, strategy="resource_hierarchy"):
        self.n = n
        self.strategy = strategy
        self.philosophers = [State.THINKING] * n
        self.forks = [threading.Lock() for _ in range(n)]
        self.eat_counts = [0] * n
        self.wait_times = [0.0] * n
        self.think_times = [0.0] * n
        self.eat_times = [0.0] * n
        self.running = False
        self.threads = []
        self.events = queue.Queue(maxsize=500)
        self.lock = threading.Lock()
        self.semaphore = threading.Semaphore(n - 1)  # for semaphore strategy

    def log(self, philosopher_id, action, state):
        event = {
            "time": round(time.time() * 1000),
            "id": philosopher_id,
            "action": action,
            "state": state,
            "counts": self.eat_counts[:],
            "states": [s.value for s in self.philosophers],
            "deadlock": self._check_deadlock()
        }
        try:
            self.events.put_nowait(event)
        except queue.Full:
            try:
                self.events.get_nowait()
                self.events.put_nowait(event)
            except:
                pass

    def _check_deadlock(self):
        # Simple deadlock detection: all philosophers are hungry and none eating
        all_hungry = all(s == State.HUNGRY for s in self.philosophers)
        return all_hungry

    def philosopher_resource_hierarchy(self, i):
        """Deadlock prevention: always pick lower-numbered fork first"""
        left = i
        right = (i + 1) % self.n
        first, second = (left, right) if left < right else (right, left)

        while self.running:
            # Thinking
            with self.lock:
                self.philosophers[i] = State.THINKING
            think_duration = random.uniform(0.5, 2.0) / sim_speed["value"]
            self.log(i, "thinking", State.THINKING.value)
            time.sleep(think_duration)
            with self.lock:
                self.think_times[i] += think_duration

            if not self.running:
                break

            # Hungry
            with self.lock:
                self.philosophers[i] = State.HUNGRY
            self.log(i, "hungry", State.HUNGRY.value)
            wait_start = time.time()

            # Pick up forks (lower index first)
            self.forks[first].acquire()
            self.forks[second].acquire()

            with self.lock:
                self.wait_times[i] += time.time() - wait_start
                self.philosophers[i] = State.EATING
            self.log(i, "eating", State.EATING.value)

            # Eating
            eat_duration = random.uniform(0.3, 1.0) / sim_speed["value"]
            time.sleep(eat_duration)

            with self.lock:
                self.eat_counts[i] += 1
                self.eat_times[i] += eat_duration

            # Put down forks
            self.forks[first].release()
            self.forks[second].release()

    def philosopher_semaphore(self, i):
        """Semaphore strategy: limit concurrent eaters to n-1"""
        left = i
        right = (i + 1) % self.n

        while self.running:
            with self.lock:
                self.philosophers[i] = State.THINKING
            think_duration = random.uniform(0.5, 2.0)
            self.log(i, "thinking", State.THINKING.value)
            time.sleep(think_duration)
            with self.lock:
                self.think_times[i] += think_duration

            if not self.running:
                break

            with self.lock:
                self.philosophers[i] = State.HUNGRY
            self.log(i, "hungry", State.HUNGRY.value)
            wait_start = time.time()

            self.semaphore.acquire()
            self.forks[left].acquire()
            self.forks[right].acquire()

            with self.lock:
                self.wait_times[i] += time.time() - wait_start
                self.philosophers[i] = State.EATING
            self.log(i, "eating", State.EATING.value)

            eat_duration = random.uniform(0.3, 1.0)
            time.sleep(eat_duration)

            with self.lock:
                self.eat_counts[i] += 1
                self.eat_times[i] += eat_duration

            self.forks[left].release()
            self.forks[right].release()
            self.semaphore.release()

    def philosopher_deadlock(self, i):
        """Naive strategy that CAN deadlock: all pick left fork first"""
        left = i
        right = (i + 1) % self.n

        while self.running:
            with self.lock:
                self.philosophers[i] = State.THINKING
            think_duration = random.uniform(0.5, 2.0)
            self.log(i, "thinking", State.THINKING.value)
            time.sleep(think_duration)
            with self.lock:
                self.think_times[i] += think_duration

            if not self.running:
                break

            with self.lock:
                self.philosophers[i] = State.HUNGRY
            self.log(i, "hungry", State.HUNGRY.value)
            wait_start = time.time()

            # Naive: always pick left first (deadlock prone)
            self.forks[left].acquire()
            time.sleep(0.05)  # Small delay to increase deadlock chance
            acquired = self.forks[right].acquire(timeout=3.0)

            if acquired:
                with self.lock:
                    self.wait_times[i] += time.time() - wait_start
                    self.philosophers[i] = State.EATING
                self.log(i, "eating", State.EATING.value)

                eat_duration = random.uniform(0.3, 1.0)
                time.sleep(eat_duration)

                with self.lock:
                    self.eat_counts[i] += 1
                    self.eat_times[i] += eat_duration

                self.forks[right].release()
            else:
                self.log(i, "deadlock_abort", State.HUNGRY.value)

            self.forks[left].release()

    def start(self):
        self.running = True
        self.threads = []
        
        for i in range(self.n):
            if self.strategy == "resource_hierarchy":
                t = threading.Thread(target=self.philosopher_resource_hierarchy, args=(i,), daemon=True)
            elif self.strategy == "semaphore":
                t = threading.Thread(target=self.philosopher_semaphore, args=(i,), daemon=True)
            else:
                t = threading.Thread(target=self.philosopher_deadlock, args=(i,), daemon=True)
            self.threads.append(t)
            t.start()

    def stop(self):
        self.running = False

    def reset(self, n=None, strategy=None):
        self.stop()
        time.sleep(0.5)
        if n:
            self.n = n
        if strategy:
            self.strategy = strategy
        self.philosophers = [State.THINKING] * self.n
        self.forks = [threading.Lock() for _ in range(self.n)]
        self.eat_counts = [0] * self.n
        self.wait_times = [0.0] * self.n
        self.think_times = [0.0] * self.n
        self.eat_times = [0.0] * self.n
        self.semaphore = threading.Semaphore(self.n - 1)
        while not self.events.empty():
            try:
                self.events.get_nowait()
            except:
                break

    def get_stats(self):
        with self.lock:
            return {
                "eat_counts": self.eat_counts[:],
                "wait_times": [round(w, 2) for w in self.wait_times],
                "think_times": [round(t, 2) for t in self.think_times],
                "eat_times": [round(e, 2) for e in self.eat_times],
                "states": [s.value for s in self.philosophers],
                "deadlock": self._check_deadlock(),
                "running": self.running,
                "strategy": self.strategy,
                "n": self.n
            }

simulation = DiningSimulation()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/start", methods=["POST"])
def start():
    data = request.json or {}
    n = int(data.get("n", 5))
    strategy = data.get("strategy", "resource_hierarchy")
    n = max(3, min(7, n))
    simulation.reset(n=n, strategy=strategy)
    simulation.start()
    return jsonify({"status": "started", "n": n, "strategy": strategy})

@app.route("/api/stop", methods=["POST"])
def stop():
    simulation.stop()
    return jsonify({"status": "stopped"})

@app.route("/api/stats")
def stats():
    return jsonify(simulation.get_stats())

@app.route("/api/stream")
def stream():
    def event_generator():
        while True:
            try:
                event = simulation.events.get(timeout=1.0)
                yield f"data: {json.dumps(event)}\n\n"
            except queue.Empty:
                yield f"data: {json.dumps({'ping': True})}\n\n"
    return Response(event_generator(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
