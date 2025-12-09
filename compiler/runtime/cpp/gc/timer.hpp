#pragma once

/**
 * GoodScript Timer Support
 * 
 * Provides setTimeout/clearTimeout functionality for C++ runtime.
 * 
 * THREAD SAFETY: Implements an event queue model similar to JavaScript/Node.js.
 * Timer threads only enqueue callbacks - they never execute user code directly.
 * User code must call processTimers() to execute pending callbacks on the main thread.
 * 
 * This maintains GoodScript's single-threaded execution guarantee while providing
 * async timer functionality compatible with TypeScript semantics.
 * 
 * NOTE: Timer support requires threading and is disabled for wasm32-wasi target.
 */

#include <functional>
#include <chrono>

// Timer support requires threading (not available in wasm32-wasi)
#if !defined(__wasi__)

#include <thread>
#include <atomic>
#include <map>
#include <queue>
#include <mutex>
#include <condition_variable>

namespace gs {

/**
 * Timer implementation using event queue pattern (JavaScript/Node.js style)
 * 
 * SAFETY GUARANTEE:
 * - Timer threads ONLY enqueue callbacks, never execute them
 * - Main thread executes callbacks via processTimers()
 * - No race conditions on user code/objects
 * - Compatible with single-threaded execution model
 */
class TimerManager {
private:
    struct TimerEntry {
        int id;
        std::chrono::steady_clock::time_point expiry;
        std::function<void()> callback;
        bool repeating;
        int interval;
        
        bool operator>(const TimerEntry& other) const {
            return expiry > other.expiry; // Min-heap (earliest first)
        }
    };
    
    struct WaitingTimer {
        std::thread thread;
        std::atomic<bool> cancelled{false};
        
        WaitingTimer() = default;
        
        // Custom move constructor (atomic isn't movable)
        WaitingTimer(WaitingTimer&& other) noexcept 
            : thread(std::move(other.thread))
            , cancelled(other.cancelled.load()) {
        }
        
        // Custom move assignment
        WaitingTimer& operator=(WaitingTimer&& other) noexcept {
            if (this != &other) {
                thread = std::move(other.thread);
                cancelled.store(other.cancelled.load());
            }
            return *this;
        }
        
        WaitingTimer(const WaitingTimer&) = delete;
        WaitingTimer& operator=(const WaitingTimer&) = delete;
    };
    
    // Event queue - callbacks ready to execute on main thread
    static std::queue<std::function<void()>> eventQueue;
    static std::mutex eventQueueMutex;
    
    // Active waiting timers (threads sleeping until expiry)
    static std::map<int, WaitingTimer> waitingTimers;
    static std::mutex waitingTimersMutex;
    
    // Timer metadata
    static std::map<int, TimerEntry> activeTimers;
    static std::mutex activeTimersMutex;
    
    static std::atomic<int> nextId;

    /**
     * Enqueue a callback to be executed on the main thread
     * Called by timer threads - NEVER executes user code directly
     */
    static void enqueueCallback(std::function<void()> callback) {
        std::lock_guard<std::mutex> lock(eventQueueMutex);
        eventQueue.push(std::move(callback));
    }

public:
    /**
     * Schedule a function to be called after a delay
     * Similar to JavaScript's setTimeout()
     * 
     * THREAD SAFETY: The callback will be executed on the main thread
     * when processTimers() is called, NOT on the timer thread.
     * 
     * @param callback Function to call after delay (executed on main thread)
     * @param milliseconds Delay in milliseconds
     * @return Timer ID that can be used with clearTimeout
     */
    static int setTimeout(std::function<void()> callback, int milliseconds) {
        return scheduleTimer(std::move(callback), milliseconds, false);
    }
    
    /**
     * Schedule a function to be called repeatedly with a fixed delay
     * Similar to JavaScript's setInterval()
     * 
     * @param callback Function to call repeatedly (executed on main thread)
     * @param milliseconds Delay between calls in milliseconds
     * @return Timer ID that can be used with clearInterval
     */
    static int setInterval(std::function<void()> callback, int milliseconds) {
        return scheduleTimer(std::move(callback), milliseconds, true);
    }

private:
    static int scheduleTimer(std::function<void()> callback, int milliseconds, bool repeating) {
        int id = nextId++;
        
        // Store timer metadata
        {
            std::lock_guard<std::mutex> lock(activeTimersMutex);
            TimerEntry entry;
            entry.id = id;
            entry.expiry = std::chrono::steady_clock::now() + std::chrono::milliseconds(milliseconds);
            entry.callback = callback;
            entry.repeating = repeating;
            entry.interval = milliseconds;
            activeTimers.emplace(id, std::move(entry));
        }
        
        // Create timer thread that will enqueue the callback when it expires
        WaitingTimer timer;
        timer.thread = std::thread([id, callback, milliseconds, repeating]() {
            std::this_thread::sleep_for(std::chrono::milliseconds(milliseconds));
            
            // Check if timer was cancelled during sleep
            bool shouldEnqueue = false;
            {
                std::lock_guard<std::mutex> lock(waitingTimersMutex);
                auto it = waitingTimers.find(id);
                if (it != waitingTimers.end() && !it->second.cancelled) {
                    shouldEnqueue = true;
                }
            }
            
            if (shouldEnqueue) {
                // Enqueue callback to be executed on main thread
                // This is the ONLY interaction with user code - just storing the function
                enqueueCallback([id, callback, repeating, milliseconds]() {
                    // This lambda executes on main thread via processTimers()
                    callback();
                    
                    // If repeating, schedule next execution
                    if (repeating) {
                        std::lock_guard<std::mutex> lock(activeTimersMutex);
                        auto it = activeTimers.find(id);
                        if (it != activeTimers.end()) {
                            // Schedule next interval
                            scheduleTimer(callback, milliseconds, true);
                        }
                    }
                });
                
                // Clean up waiting timer
                {
                    std::lock_guard<std::mutex> lock(waitingTimersMutex);
                    waitingTimers.erase(id);
                }
            }
        });
        
        std::lock_guard<std::mutex> lock(waitingTimersMutex);
        waitingTimers.emplace(id, std::move(timer));
        
        return id;
    }

public:
    /**
     * Cancel a scheduled timer
     * Similar to JavaScript's clearTimeout()
     * 
     * @param id Timer ID returned from setTimeout
     */
    static void clearTimeout(int id) {
        // Remove from active timers
        {
            std::lock_guard<std::mutex> lock(activeTimersMutex);
            activeTimers.erase(id);
        }
        
        // Cancel waiting timer thread
        {
            std::lock_guard<std::mutex> lock(waitingTimersMutex);
            auto it = waitingTimers.find(id);
            if (it != waitingTimers.end()) {
                it->second.cancelled = true;
                if (it->second.thread.joinable()) {
                    it->second.thread.detach(); // Let it exit cleanly
                }
                waitingTimers.erase(it);
            }
        }
    }
    
    /**
     * Cancel a repeating timer
     * Similar to JavaScript's clearInterval()
     * 
     * @param id Timer ID returned from setInterval
     */
    static void clearInterval(int id) {
        clearTimeout(id); // Same implementation
    }
    
    /**
     * Process pending timer callbacks on the main thread
     * 
     * IMPORTANT: This must be called from the main thread to execute
     * timer callbacks. This is where callbacks actually run.
     * 
     * For programs with event loops, call this in each iteration.
     * For programs without event loops, call before program exit.
     * 
     * @param maxCallbacks Maximum number of callbacks to process (0 = all)
     * @return Number of callbacks executed
     */
    static int processTimers(int maxCallbacks = 0) {
        std::vector<std::function<void()>> callbacks;
        
        // Dequeue all pending callbacks
        {
            std::lock_guard<std::mutex> lock(eventQueueMutex);
            int count = (maxCallbacks > 0) ? maxCallbacks : static_cast<int>(eventQueue.size());
            
            while (!eventQueue.empty() && (maxCallbacks == 0 || callbacks.size() < static_cast<size_t>(maxCallbacks))) {
                callbacks.push_back(std::move(eventQueue.front()));
                eventQueue.pop();
            }
        }
        
        // Execute callbacks on main thread (outside lock)
        for (auto& callback : callbacks) {
            callback();
        }
        
        return static_cast<int>(callbacks.size());
    }
    
    /**
     * Check if there are pending timer callbacks
     * 
     * @return true if there are callbacks waiting to be processed
     */
    static bool hasPendingCallbacks() {
        std::lock_guard<std::mutex> lock(eventQueueMutex);
        return !eventQueue.empty();
    }
    
    /**
     * Cleanup all timers (call at program exit)
     * Also processes any pending callbacks
     */
    static void cleanup() {
        // Process any remaining callbacks
        processTimers();
        
        // Cancel all waiting timers
        {
            std::lock_guard<std::mutex> lock(waitingTimersMutex);
            for (auto& pair : waitingTimers) {
                pair.second.cancelled = true;
                if (pair.second.thread.joinable()) {
                    pair.second.thread.detach();
                }
            }
            waitingTimers.clear();
        }
        
        // Clear active timers
        {
            std::lock_guard<std::mutex> lock(activeTimersMutex);
            activeTimers.clear();
        }
        
        // Clear event queue
        {
            std::lock_guard<std::mutex> lock(eventQueueMutex);
            while (!eventQueue.empty()) {
                eventQueue.pop();
            }
        }
    }
};

// Static member initialization (inline to avoid duplicate symbols)
inline std::queue<std::function<void()>> TimerManager::eventQueue;
inline std::mutex TimerManager::eventQueueMutex;
inline std::map<int, TimerManager::WaitingTimer> TimerManager::waitingTimers;
inline std::mutex TimerManager::waitingTimersMutex;
inline std::map<int, TimerManager::TimerEntry> TimerManager::activeTimers;
inline std::mutex TimerManager::activeTimersMutex;
inline std::atomic<int> TimerManager::nextId{1};

/**
 * Global setTimeout function (JavaScript-compatible API)
 * 
 * THREAD SAFETY: Callback executes on main thread via processTimers()
 */
inline int setTimeout(std::function<void()> callback, int milliseconds) {
    return TimerManager::setTimeout(callback, milliseconds);
}

/**
 * Global clearTimeout function (JavaScript-compatible API)
 */
inline void clearTimeout(int id) {
    TimerManager::clearTimeout(id);
}

/**
 * Overload for optional timer IDs (from nullable number | null)
 */
inline void clearTimeout(std::optional<double> id) {
    if (id.has_value()) {
        TimerManager::clearTimeout(static_cast<int>(id.value()));
    }
}

/**
 * Global setInterval function (JavaScript-compatible API)
 * 
 * THREAD SAFETY: Callback executes on main thread via processTimers()
 */
inline int setInterval(std::function<void()> callback, int milliseconds) {
    return TimerManager::setInterval(callback, milliseconds);
}

/**
 * Global clearInterval function (JavaScript-compatible API)
 */
inline void clearInterval(int id) {
    TimerManager::clearInterval(id);
}

/**
 * Process pending timer callbacks
 * 
 * IMPORTANT: Must be called from main thread to execute timer callbacks.
 * 
 * For event loop programs, call this in each iteration:
 *   while (running) {
 *     gs::processTimers();
 *     // ... other work
 *   }
 * 
 * For simple programs, call before exit:
 *   int main() {
 *     // ... set up timers
 *     gs::processTimers(); // Execute any pending callbacks
 *     return 0;
 *   }
 */
inline int processTimers(int maxCallbacks = 0) {
    return TimerManager::processTimers(maxCallbacks);
}

/**
 * Check if there are pending timer callbacks
 */
inline bool hasPendingTimers() {
    return TimerManager::hasPendingCallbacks();
}

} // namespace gs

#else // __wasi__

// Stub implementation for wasm32-wasi (no threading support)
namespace gs {

// Stub timer functions that do nothing
inline double setTimeout(std::function<void()>, double) { return -1.0; }
inline void clearTimeout(double) {}
inline double setInterval(std::function<void()>, double) { return -1.0; }
inline void clearInterval(double) {}
inline void processTimers() {}
inline bool hasPendingTimers() { return false; }

// Optional overloads
inline double setTimeout(std::function<void()>, std::optional<double>) { return -1.0; }
inline void clearTimeout(std::optional<double>) {}
inline double setInterval(std::function<void()>, std::optional<double>) { return -1.0; }
inline void clearInterval(std::optional<double>) {}

} // namespace gs

#endif // __wasi__
