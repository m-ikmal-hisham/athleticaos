export async function retryOnce<T>(fn: () => Promise<T>, delayMs = 1000): Promise<T> {
    try {
        return await fn();
    } catch {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return await fn();
    }
}
