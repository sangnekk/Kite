import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CodeIcon,
  DatabaseZapIcon,
  EditIcon,
  EyeIcon,
  GamepadIcon,
  RouterIcon,
  ServerIcon,
  UsersIcon,
} from "lucide-react";

interface FeatureProps {
  icon: JSX.Element;
  title: string;
  description: string;
}

const features: FeatureProps[] = [
  {
    icon: <DatabaseZapIcon />,
    title: "Hoạt động 24/7",
    description:
      "Vibe Bot cung cấp hosting 24/7 cho bot Discord của bạn, không cần lo lắng về uptime.",
  },

  {
    icon: <EditIcon />,
    title: "Tùy chỉnh dễ dàng",
    description:
      "Tùy chỉnh giao diện và tính năng bot Discord với giao diện thân thiện của Vibe Bot.",
  },
  {
    icon: <CodeIcon />,
    title: "Không cần code",
    description:
      "Bạn có thể tạo bot Discord mà không cần viết một dòng code nào.",
  },
  {
    icon: <UsersIcon />,
    title: "Cộng tác",
    description:
      "Làm việc cùng nhau để tạo bot Discord hoàn hảo cho server của bạn.",
  },
];

export default function HomeFeaturesSection() {
  return (
    <section id="features" className="container text-center py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold ">
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          Tất cả{" "}
        </span>
        trong một nơi
      </h2>
      <p className="md:w-3/4 mx-auto mt-4 mb-8 text-xl text-muted-foreground">
        Vibe Bot cung cấp mọi công cụ bạn cần để tạo bot Discord cho server của
        bạn.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map(({ icon, title, description }: FeatureProps) => (
          <Card key={title} className="bg-muted/50">
            <CardHeader>
              <CardTitle className="grid gap-4 place-items-center">
                {icon}
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>{description}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
