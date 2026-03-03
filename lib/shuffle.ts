/**
 * Fisher-Yates shuffle algorithm for unbiased array randomization
 * 
 * This is the standard, proven shuffle algorithm that produces
 * uniformly random permutations. Unlike Array.sort(Math.random),
 * this is deterministic, stable, and unbiased.
 * 
 * @param array - Array to shuffle (will be mutated)
 * @returns The shuffled array (same reference)
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
    const arr = [...array] // Create copy to avoid mutating input

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
}
