import { ClientStatus } from "./status.js";

export abstract class AbstractClient<T> {

    protected abstract _client: T | undefined;
    protected _status: ClientStatus;

    constructor() {
        this._status = ClientStatus.UNDEFINED;
    }

    protected abstract _setStatusFromError(thrownError: any): void;

    /**
     * @brief Reports whether the instance is currently authenticated.
     */
    protected _isAuthenticated(): boolean {
        return this._status === ClientStatus.LOGGED_IN && this._client !== undefined;
    }

    getStatus(): ClientStatus {
        return this._status;
    }


}
