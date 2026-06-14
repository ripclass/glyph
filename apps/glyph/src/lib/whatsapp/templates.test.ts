import { describe, it, expect } from "vitest";
import { TEMPLATE_NAMES, TEMPLATE_LANG, followupParams, appointmentReminderParams, doctorNudgeParams } from "./templates";

describe("templates", () => {
  it("names + lang", () => {
    expect(TEMPLATE_NAMES.followup).toBe("glyph_followup");
    expect(TEMPLATE_NAMES.appointment_reminder).toBe("glyph_appointment_reminder");
    expect(TEMPLATE_NAMES.doctor_nudge).toBe("glyph_doctor_nudge");
    expect(TEMPLATE_LANG).toBe("bn");
  });
  it("ordered body params", () => {
    expect(followupParams("করিম")).toEqual(["করিম"]);
    expect(appointmentReminderParams("করিম", "১৬ জুন", "ডা. রহমান")).toEqual(["করিম", "১৬ জুন", "ডা. রহমান"]);
    expect(doctorNudgeParams("৫২, বুকে ব্যথা")).toEqual(["৫২, বুকে ব্যথা"]);
  });
});
