///////////////////////////////////////////////////////////////////////////////
// gs::Promise<T> - Promise wrapper around cppcoro::task<T>
// 
// Provides storage semantics and Promise API for async operations.
// This is a lightweight wrapper that enables:
// - Storing promises as member variables
// - Deferred completion patterns (Completer, Future)
// - Promise combinators (all, race, etc. - to be added)
///////////////////////////////////////////////////////////////////////////////

#pragma once

#include <cppcoro/task.hpp>
#include <cppcoro/sync_wait.hpp>
#include <memory>
#include <functional>
#include <optional>

namespace gs {

// Forward declaration
template<typename T>
class Promise;

namespace detail {
    // Promise controller - allows external completion of a promise
    template<typename T>
    struct PromiseController {
        std::optional<T> value;
        std::optional<gs::Error> error;
        bool completed = false;
        
        void resolve(T val) {
            if (completed) return;
            value = std::move(val);
            completed = true;
        }
        
        void reject(gs::Error err) {
            if (completed) return;
            error = std::move(err);
            completed = true;
        }
    };
    
    // Specialization for void
    template<>
    struct PromiseController<void> {
        std::optional<gs::Error> error;
        bool completed = false;
        
        void resolve() {
            if (completed) return;
            completed = true;
        }
        
        void reject(gs::Error err) {
            if (completed) return;
            error = std::move(err);
            completed = true;
        }
    };
    
    // Promise state - holds the task and allows deferred completion
    template<typename T>
    class PromiseState {
    public:
        std::optional<cppcoro::task<T>> task;
        std::shared_ptr<PromiseController<T>> controller;
        
        PromiseState() = default;
        PromiseState(cppcoro::task<T>&& t) : task(std::move(t)) {}
        PromiseState(std::shared_ptr<PromiseController<T>> ctrl) : controller(ctrl) {}
    };
}

template<typename T>
class Promise {
private:
    std::shared_ptr<detail::PromiseState<T>> state_;
    
    // Helper coroutine for executor-based promise
    static cppcoro::task<T> executor_task(
        std::function<void(std::function<void(T)>, std::function<void(gs::Error)>)> executor,
        std::shared_ptr<detail::PromiseController<T>> controller
    ) {
        // Call the executor with resolve/reject functions
        executor(
            [controller](T value) { controller->resolve(std::move(value)); },
            [controller](gs::Error error) { controller->reject(std::move(error)); }
        );
        
        // Wait for completion (polling for now - could use condition variable)
        while (!controller->completed) {
            // Yield to allow other coroutines to run
            co_await cppcoro::suspend_always{};
        }
        
        // Check if rejected
        if (controller->error.has_value()) {
            throw controller->error.value();
        }
        
        // Return the value
        co_return std::move(controller->value.value());
    }
    
public:
    // Default constructor - creates empty promise
    Promise() : state_(std::make_shared<detail::PromiseState<T>>()) {}
    
    // Construct from cppcoro::task
    Promise(cppcoro::task<T>&& task) 
        : state_(std::make_shared<detail::PromiseState<T>>(std::move(task))) {}
    
    // Construct with executor function: new Promise((resolve, reject) => {...})
    Promise(std::function<void(std::function<void(T)>, std::function<void(gs::Error)>)> executor) {
        auto controller = std::make_shared<detail::PromiseController<T>>();
        state_ = std::make_shared<detail::PromiseState<T>>(controller);
        state_->task = executor_task(std::move(executor), controller);
    }
    
    // Move semantics
    Promise(Promise&&) = default;
    Promise& operator=(Promise&&) = default;
    
    // Copy semantics (shares the underlying state)
    Promise(const Promise&) = default;
    Promise& operator=(const Promise&) = default;
    
    // Check if promise has a task
    bool has_value() const {
        return state_ && state_->task.has_value();
    }
    
    // Set the task (for deferred completion)
    void set_task(cppcoro::task<T>&& task) {
        if (!state_) {
            state_ = std::make_shared<detail::PromiseState<T>>();
        }
        state_->task = std::move(task);
    }
    
    // Get the underlying task (consumes it)
    cppcoro::task<T> take_task() {
        if (!state_ || !state_->task.has_value()) {
            throw std::runtime_error("Promise has no task");
        }
        auto task = std::move(*state_->task);
        state_->task.reset();
        return task;
    }
    
    // Awaitable - allows co_await promise
    auto operator co_await() {
        if (!has_value()) {
            throw std::runtime_error("Cannot await empty promise");
        }
        return state_->task->operator co_await();
    }
    
    // Sync wait (for testing/compatibility)
    T sync_wait() {
        return cppcoro::sync_wait(take_task());
    }
    
    // Static helper: Promise.resolve(value)
    static Promise<T> resolve(T value) {
        return Promise<T>([value](auto resolve, auto reject) {
            resolve(value);
        });
    }
    
    // Static helper: Promise.reject(error)
    static Promise<T> reject(gs::Error error) {
        return Promise<T>([error](auto resolve, auto reject) {
            reject(error);
        });
    }
};

// Specialization for void
template<>
class Promise<void> {
private:
    std::shared_ptr<detail::PromiseState<void>> state_;
    
    // Helper coroutine for executor-based promise
    static cppcoro::task<void> executor_task(
        std::function<void(std::function<void()>, std::function<void(gs::Error)>)> executor,
        std::shared_ptr<detail::PromiseController<void>> controller
    ) {
        // Call the executor with resolve/reject functions
        executor(
            [controller]() { controller->resolve(); },
            [controller](gs::Error error) { controller->reject(std::move(error)); }
        );
        
        // Wait for completion
        while (!controller->completed) {
            co_await cppcoro::suspend_always{};
        }
        
        // Check if rejected
        if (controller->error.has_value()) {
            throw controller->error.value();
        }
        
        co_return;
    }
    
public:
    Promise() : state_(std::make_shared<detail::PromiseState<void>>()) {}
    
    Promise(cppcoro::task<void>&& task) 
        : state_(std::make_shared<detail::PromiseState<void>>(std::move(task))) {}
    
    // Construct with executor function
    Promise(std::function<void(std::function<void()>, std::function<void(gs::Error)>)> executor) {
        auto controller = std::make_shared<detail::PromiseController<void>>();
        state_ = std::make_shared<detail::PromiseState<void>>(controller);
        state_->task = executor_task(std::move(executor), controller);
    }
    
    Promise(Promise&&) = default;
    Promise& operator=(Promise&&) = default;
    
    Promise(const Promise&) = default;
    Promise& operator=(const Promise&) = default;
    
    bool has_value() const {
        return state_ && state_->task.has_value();
    }
    
    void set_task(cppcoro::task<void>&& task) {
        if (!state_) {
            state_ = std::make_shared<detail::PromiseState<void>>();
        }
        state_->task = std::move(task);
    }
    
    cppcoro::task<void> take_task() {
        if (!state_ || !state_->task.has_value()) {
            throw std::runtime_error("Promise has no task");
        }
        auto task = std::move(*state_->task);
        state_->task.reset();
        return task;
    }
    
    auto operator co_await() {
        if (!has_value()) {
            throw std::runtime_error("Cannot await empty promise");
        }
        return state_->task->operator co_await();
    }
    
    void sync_wait() {
        cppcoro::sync_wait(take_task());
    }
    
    // Static helper: Promise.resolve()
    static Promise<void> resolve() {
        return Promise<void>([](auto resolve, auto reject) {
            resolve();
        });
    }
    
    // Static helper: Promise.reject(error)
    static Promise<void> reject(gs::Error error) {
        return Promise<void>([error](auto resolve, auto reject) {
            reject(error);
        });
    }
};

} // namespace gs
