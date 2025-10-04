type ClientProps = {
    apiKey: string
    urlEndpoint: string
}

type TrackProps = {
    event: string
    anonymousId?: string
    externalId?: string
    properties: Record<string, any>
}

type EventProps = {
    name: string
    anonymousId?: string
    externalId?: string
    properties?: Record<string, any>
}

type IdentifyProps = {
    anonymousId?: string
    externalId: string
    phone?: string
    email?: string
    timezone?: string
    locale?: string
    traits: Record<string, any>
}

type AliasProps = {
    anonymousId: string
    externalId: string
}

export class Client {
    #apiKey: string
    #urlEndpoint: string

    constructor(props: ClientProps) {
        this.#apiKey = props.apiKey
        this.#urlEndpoint = props.urlEndpoint
    }

    async track({ properties: data, ...props }: TrackProps) {
        return await this.#request('track', { ...props, data })
    }

    async events(props: EventProps[]) {
        return await this.#request('events', props.map(({ properties: data, ...rest }) => ({ ...rest, data })))
    }

    async identify({ traits: data, ...props }: IdentifyProps) {
        return await this.#request('identify', { ...props, data })
    }

    async alias(props: AliasProps) {
        return await this.#request('identify', props)
    }

    #mapKeys(value: Record<string, any> | Record<string, any>[]): Record<string, any> | Record<string, any>[] {
        if (Array.isArray(value)) {
            return value.map((item) => this.#mapKeys(item));
        }

        const camelToUnderscore = (key: string) => key.replace(/([A-Z])/g, "_$1").toLowerCase()

        const newObj: Record<string, any> = {}
        for (const key in value) {
            newObj[camelToUnderscore(key)] = value[key]
        }

        return newObj
    }

    async #request(path: string, data: Record<string, any>) {
        const request = await fetch(`${this.#urlEndpoint}/client/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#apiKey}`,
            },
            body: JSON.stringify(this.#mapKeys(data)),
        })
        return await request.text()
    }
}

export class BrowserClient extends Client {

    #anonymousId: string = this.uuid()
    #externalId?: string
    #client: Client

    constructor(props: ClientProps) {
        super(props)
        this.#client = new Client(props)
    }

    async track(props: TrackProps) {
        return await this.#client.track({
            ...props,
            anonymousId: props.anonymousId ?? this.#anonymousId,
            externalId: props.externalId ?? this.#externalId,
        })
    }

    async events(props: EventProps[]) {
        return await this.#client.events(props.map((event) => {
            return {
                ...event,
                anonymousId: event.anonymousId ?? this.#anonymousId,
                externalId: event.externalId ?? this.#externalId,
            }
        }))
    }

    async identify(props: IdentifyProps) {
        this.#externalId = props.externalId
        return await this.#client.identify({
            ...props,
            anonymousId: props.anonymousId ?? this.#anonymousId,
            externalId: props.externalId ?? this.#externalId,
        })
    }

    async alias(props: AliasProps) {
        this.#externalId = props.externalId
        return await this.#client.alias(props)
    }

    uuid() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        )
    }
}

export class Parcelvoy {
    static instance?: BrowserClient = undefined

    static initialize(props: ClientProps) {
        Parcelvoy.instance = new BrowserClient(props)
    }

    static async track(props: TrackProps) {
        return await Parcelvoy.instance?.track(props)
    }

    static async events(props: EventProps[]) {
        return await Parcelvoy.instance?.events(props)
    }

    static async identify(props: IdentifyProps) {
        return await Parcelvoy.instance?.identify(props)
    }

    static async alias(props: AliasProps) {
        return await Parcelvoy.instance?.alias(props)
    }
}


// If running in a browser, expose Parcelvoy from the window object
declare global {
    interface Window { Parcelvoy: any; }
}

if (typeof window !== 'undefined') {
    window.Parcelvoy = Parcelvoy
}
