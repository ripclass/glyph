import { describe, it, expect } from "vitest";
import { extractInbound } from "./parse";
import type { WAWebhookPayload } from "./types";

const textPayload: WAWebhookPayload = {
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: "8801711000000", profile: { name: "Karim" } }],
            messages: [
              { id: "wamid.1", from: "8801711000000", timestamp: "1700000000", type: "text", text: { body: "hi" } },
            ],
          },
        },
      ],
    },
  ],
};

describe("extractInbound", () => {
  it("normalizes a text message", () => {
    const [msg] = [...extractInbound(textPayload)];
    expect(msg.kind).toBe("text");
    expect(msg.text).toBe("hi");
    expect(msg.fromWaId).toBe("8801711000000");
    expect(msg.fromName).toBe("Karim");
    expect(msg.providerMessageId).toBe("wamid.1");
  });

  it("normalizes an image with caption", () => {
    const payload: WAWebhookPayload = {
      entry: [{ changes: [{ value: { messages: [
        { id: "wamid.2", from: "8801711000000", timestamp: "1700000000", type: "image", image: { id: "media-1", mime_type: "image/jpeg", caption: "my Rx" } },
      ] } }] }],
    };
    const [msg] = [...extractInbound(payload)];
    expect(msg.kind).toBe("image");
    expect(msg.mediaId).toBe("media-1");
    expect(msg.text).toBe("my Rx");
  });

  it("yields nothing for a payload with no messages (status update)", () => {
    expect([...extractInbound({ entry: [{ changes: [{ value: {} }] }] })]).toHaveLength(0);
  });

  it("normalizes a location message to kind:location with coords", () => {
    const payload = {
      entry: [{ changes: [{ value: { messages: [{
        id: "wamid.loc1", from: "8801700000000", timestamp: "1718900000",
        type: "location", location: { latitude: 23.8103, longitude: 90.4125 },
      }] } }] }],
    };
    const [msg] = [...extractInbound(payload as never)];
    expect(msg.kind).toBe("location");
    expect(msg.location).toEqual({ lat: 23.8103, lon: 90.4125 });
    expect(msg.text).toBe("");
  });
});
