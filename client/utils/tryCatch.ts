type Success<T> = {
    data: T;
    error: null;
};

type Failure<T, E> = {
    data?: T;
    error: E;
};

type Result<T, E = Error> = Success<T> | Failure<T, E>;

// Main wrapper function
export async function tryCatch<T, E = Error>(
    promise: Promise<T>,
): Promise<Result<T, E>> {
    let data: T = null as any;
    try {
        data = await promise;
        return { data, error: null };
    } catch (error) {
        console.log('ININININININ Error:', data);

        return { data: data as T, error: error as E };
    }
}