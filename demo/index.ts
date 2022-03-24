import axios from "axios";
import { createCeek } from "../src";

const ceek = createCeek({ baseUrl: '/api/'});

type Handler = [string, () => void];

const handlers: Handler[] = [
  [
    "res-text (responseType text)",
    () => {
      ceek
        .request({
          method: "GET",
          url: "res-text",
          responseType: "text",
        })
        .then(({ body }) => {
          console.log(body);
        });
    },
  ],
  [
    "req-text-res-text (responseType json)",
    () => {
      ceek
        .request({
          method: "GET",
          url: "res-text",
        })
        .then(({ body }) => {
          console.log(body);
        });
      axios
        .get("/api/res-text", {
          responseType: "json",
        })
        .then((resp) => {
          console.log(resp.data);
        });
      fetch("/api/res-text", {
        method: "GET",
      })
        .then((resp) => {
          return resp.json();
        })
        .then((data) => {
          console.log("fetch", data);
        });
    },
  ],
  [
    "res-text (responseType blob)",
    () => {
      ceek
        .request({
          method: "GET",
          url: "res-text",
          responseType: "blob",
        })
        .then(({ body }) => {
          console.log(body);
        });
    },
  ],
  [
    "res-text (responseType array buffer)",
    () => {
      ceek
        .request({
          method: "GET",
          url: "res-text",
          responseType: "arraybuffer",
        })
        .then(({ body }) => {
          console.log(body);
        });
    },
  ],
  [
    "req-json-res-text (responseType json)",
    () => {
      ceek
        .request({
          method: "GET",
          url: "res-text",
          json: {
            jsonKey: "jsonValue"
          }
        })
        .then(({ body }) => {
          console.log(body);
        });
    },
  ],
  [
    "req-json-res-json (responseType json)",
    () => {
      ceek
        .request({
          method: "GET",
          url: "res-json",
          json: {
            jsonKey: "jsonValue"
          }
        })
        .then(({ body }) => {
          console.log(body);
        });
      // axios.get("/api/res-json").then((resp) => {
      //   console.log("axios", resp.data);
      // });
      // fetch("/api/res-json", {
      //   method: "GET",
      // })
      //   .then((resp) => {
      //     return resp.json();
      //   })
      //   .then((data) => {
      //     console.log("fetch", data);
      //   });
    },
  ],
  [
    "post-req-json-res-json (responseType json)",
    () => {
      ceek
        .request({
          method: "POST",
          url: "res-json",
          json: {
            jsonKey: "jsonValue"
          }
        })
        .then(({ body }) => {
          console.log(body);
        });
      // axios.get("/api/res-json").then((resp) => {
      //   console.log("axios", resp.data);
      // });
      // fetch("/api/res-json", {
      //   method: "GET",
      // })
      //   .then((resp) => {
      //     return resp.json();
      //   })
      //   .then((data) => {
      //     console.log("fetch", data);
      //   });
    },
  ],
  [
    "req-text-res-json-content-type-json (responseType json)",
    () => {
      ceek
        .request({
          method: "GET",
          url: "res-json-content-type-json",
        })
        .then(({ body }) => {
          console.log(body);
        });
      axios.get("res-json-content-type-json").then((resp) => {
        console.log("axios", resp.data);
      });
    },
  ],
  [
    "req-text-res-json-content-type-json (responseType text)",
    () => {
      ceek
        .request({
          method: "GET",
          url: "res-json-content-type-json",
          responseType: "text"
        })
        .then(({ body }) => {
          console.log(body);
        })
      axios
        .get("/api/res-json-content-type-json", { responseType: "text" })
        .then((resp) => {
          console.log("axios text", resp.data);
        });
    },
  ],
];

handlers.forEach(([selector, handler]) => {
  const button = document.createElement("button");
  button.id = selector;
  button.textContent = selector;
  button.style.margin = "0 12px 8px 0";
  document.body.appendChild(button);
  button.addEventListener("click", handler);
});
