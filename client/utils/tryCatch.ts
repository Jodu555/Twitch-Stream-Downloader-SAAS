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
        console.log('ININININININ Error:', error, data);

        return { data: data as T, error: error as E };
    }
}
import Swal from 'sweetalert2';

type FetchError = {
    data: {
        success: false;
        method: string;
        path: string;
        error: {
            message: string;
            stack: string;
        };
    };
};

export async function fetchErrorHandler(error: any, cleanup: () => void = () => { }) {
    if (error) {
        if (error.name !== 'FetchError') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                icon: 'error',
                title: 'Failed to connect to the server',
                timerProgressBar: true,
            });
            cleanup();
            return;
        }
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            icon: 'error',
            title: (error as any).data.error.message,
            timerProgressBar: true,
        });
        cleanup();
        return;
    }
}