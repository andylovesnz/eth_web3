import http from "http";
import https from "https";
import { parse } from "url"

export type GetUrlResponse = {
    statusCode: number,
    statusMessage: string;
    headers: { [ key: string] : string };
    body: Uint8Array;
};

export type Options = {
    method?: string,
    body?: Uint8Array
    headers?: { [ key: string] : string },
};

function getResponse(request: http.ClientRequest): Promise<GetUrlResponse> {
    return new Promise((resolve, reject) => {
        request.once("response", (resp: http.IncomingMessage) => {
            const response: GetUrlResponse = {
                statusCode: resp.statusCode,
                statusMessage: resp.statusMessage,
                headers: Object.keys(resp.headers).reduce((accum, name) => {
                    let value = resp.headers[name];
                    if (Array.isArray(value)) {
                        value = value.join(", ");
                    }
                    accum[name] = value;
                    return accum;
                }, <{ [ name: string ]: string }>{ }),
                body: null
            };
            //resp.setEncoding("utf8");

            resp.on("data", (chunk: Uint8Array) => {
                if (response.body == null) { response.body = new Uint8Array(0); }

                const body = new Uint8Array(response.body.length + chunk.length);
                body.set(response.body, 0);
                body.set(chunk, response.body.length);

                response.body = body;
            });

            resp.on("end", () => {
                resolve(response);
            });

            resp.on("error", (error) => {
                /* istanbul ignore next */
                (<any>error).response = response;
                reject(error);
            });
        });

        request.on("error", (error) => { reject(error); });
    });
}

// The URL.parse uses null instead of the empty string
function nonnull(value: string): string {
    if (value == null) { return ""; }
    return value;
}

export async function getUrl(href: string, options?: Options): Promise<GetUrlResponse> {
    if (options == null) { options = { }; }

    // @TODO: Once we drop support for node 8, we can pass the href
    //        firectly into request and skip adding the components
    //        to this request object
    const url = parse(href);

    const request = {
        protocol: nonnull(url.protocol),
        hostname: nonnull(url.hostname),
        port: nonnull(url.port),
        path: (nonnull(url.pathname) + nonnull(url.search)),

        method: (options.method || "GET"),
        headers: (options.headers || { }),
    };

    let req: http.ClientRequest = null;
    switch (nonnull(url.protocol)) {
        case "http:":
            req = http.request(request);
            break;
        case "https:":
            req = https.request(request);
            break;
        default:
            /* istanbul ignore next */
            throw new Error(`unsupported protocol ${ url.protocol }`);
    }

    if (options.body) {
        req.write(Buffer.from(options.body));
    }
    req.end();

    const response = await getResponse(req);
    return response;
}

