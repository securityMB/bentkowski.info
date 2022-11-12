type DateFormat = "long" | "yyyy-mm-dd";

export function formatDate(date: Date, format: DateFormat) {
  switch (format) {
    case "long": {
      return date.toLocaleDateString("en-gb", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      });
    }
    case "yyyy-mm-dd": {
      return date.toISOString().split("T")[0];
    }
    default: {
      throw new Error("Unexpected DateFormat");
    }
  }
}
