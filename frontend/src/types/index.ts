export type Audience = {
  name: string;
  description: string;
  icon: "farmer" | "buyer" | "transporter";
  highlights: string[];
};

export type Step = {
  title: string;
  description: string;
};
