import { useWebhookIntegrations } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import {
  useWebhookIntegrationCreateMutation,
  useWebhookIntegrationDeleteMutation,
  useWebhookIntegrationUpdateEnabledMutation,
  useWebhookIntegrationUpdateMutation,
} from "@/lib/api/mutations";
import { WebhookIntegration } from "@/lib/types/wire.gen";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, RefreshCwIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import ConfirmDialog from "../common/ConfirmDialog";
import LoadingButton from "../common/LoadingButton";

interface IntegrationDef {
  type: string;
  name: string;
  description: string;
  secretLabel: string;
  secretHint: string;
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    type: "sepay",
    name: "SePay",
    description:
      "Nhận thông báo giao dịch ngân hàng từ SePay. Bot sẽ được kích hoạt mỗi khi có giao dịch mới.",
    secretLabel: "API Key",
    secretHint:
      "Nhập API Key từ trang cài đặt SePay của bạn. Kite sẽ xác thực chữ ký qua header Authorization: Apikey.",
  },
  {
    type: "thueapibank",
    name: "ThueAPIBank",
    description:
      "Nhận thông báo giao dịch từ ThueAPIBank. Phù hợp để theo dõi thanh toán tự động.",
    secretLabel: "Signature",
    secretHint:
      "Sao chép giá trị Signature từ dashboard ThueAPIBank và dán vào đây. ThueAPIBank sẽ tự động gửi kèm signature này trong header khi gọi webhook.",
  },
  {
    type: "custom",
    name: "Webhook tùy chỉnh",
    description:
      "Nhận sự kiện từ bất kỳ dịch vụ nào hỗ trợ gửi webhook. Xác thực bằng header X-SEC-KEY.",
    secretLabel: "Secret Key",
    secretHint:
      "Kite sẽ xác thực webhook qua header X-Sec-Key. Đặt giá trị này vào header khi gửi request.",
  },
];

export function IntegrationList() {
  const integrations = useWebhookIntegrations();
  const appId = useAppId();

  const createMutation = useWebhookIntegrationCreateMutation(appId);

  const getIntegration = (type: string) =>
    integrations?.find((i) => i?.type === type) ?? null;

  const handleEnable = useCallback(
    (type: string) => {
      if (createMutation.isPending) return;
      createMutation.mutate(
        { type },
        {
          onSuccess(res) {
            if (res.success) {
              toast.success("Đã bật tích hợp!");
            } else {
              toast.error(
                `Bật tích hợp thất bại: ${res.error.message} (${res.error.code})`
              );
            }
          },
        }
      );
    },
    [createMutation]
  );

  if (!integrations) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {INTEGRATIONS.map((def) => {
        const integration = getIntegration(def.type);
        return (
          <IntegrationCard
            key={def.type}
            def={def}
            integration={integration}
            onEnable={() => handleEnable(def.type)}
            enabling={createMutation.isPending}
            appId={appId}
          />
        );
      })}
    </div>
  );
}

function IntegrationCard({
  def,
  integration,
  onEnable,
  enabling,
  appId,
}: {
  def: IntegrationDef;
  integration: WebhookIntegration | null;
  onEnable: () => void;
  enabling: boolean;
  appId: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{def.name}</CardTitle>
          {integration && (
            <Badge variant={integration.enabled ? "default" : "secondary"}>
              {integration.enabled ? "Đang bật" : "Tắt"}
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {def.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto pt-0">
        {integration ? (
          <IntegrationConfigDialog
            def={def}
            integration={integration}
            appId={appId}
          >
            <Button variant="outline" size="sm" className="w-full">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Cài đặt
            </Button>
          </IntegrationConfigDialog>
        ) : (
          <LoadingButton
            size="sm"
            className="w-full"
            loading={enabling}
            onClick={onEnable}
          >
            Bật tích hợp
          </LoadingButton>
        )}
      </CardFooter>
    </Card>
  );
}

function IntegrationConfigDialog({
  def,
  integration,
  appId,
  children,
}: {
  def: IntegrationDef;
  integration: WebhookIntegration;
  appId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secretInput, setSecretInput] = useState(integration.secret);
  const [urlCopied, setUrlCopied] = useState(false);

  const updateMutation = useWebhookIntegrationUpdateMutation(
    appId,
    integration.id
  );
  const updateEnabledMutation = useWebhookIntegrationUpdateEnabledMutation(
    appId,
    integration.id
  );
  const deleteMutation = useWebhookIntegrationDeleteMutation(
    appId,
    integration.id
  );

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(integration.webhook_url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }, [integration.webhook_url]);

  const regenerateSecret = useCallback(() => {
    const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setSecretInput(newSecret);
  }, []);

  const saveSecret = useCallback(() => {
    if (updateMutation.isPending) return;
    updateMutation.mutate(
      { secret: secretInput },
      {
        onSuccess(res) {
          if (res.success) {
            toast.success("Đã cập nhật secret!");
          } else {
            toast.error(
              `Cập nhật thất bại: ${res.error.message} (${res.error.code})`
            );
          }
        },
      }
    );
  }, [updateMutation, secretInput]);

  const toggleEnabled = useCallback(() => {
    updateEnabledMutation.mutate(
      { enabled: !integration.enabled },
      {
        onSuccess(res) {
          if (!res.success) {
            toast.error(
              `Cập nhật thất bại: ${res.error.message} (${res.error.code})`
            );
          }
        },
      }
    );
  }, [updateEnabledMutation, integration.enabled]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(undefined, {
      onSuccess(res) {
        if (res.success) {
          toast.success("Đã xóa tích hợp!");
          setOpen(false);
        } else {
          toast.error(
            `Xóa tích hợp thất bại: ${res.error.message} (${res.error.code})`
          );
        }
      },
    });
  }, [deleteMutation]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cài đặt {def.name}</DialogTitle>
          <DialogDescription>
            Cấu hình tích hợp và sao chép webhook URL để đặt vào dịch vụ bên
            ngoài.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="flex items-center justify-between">
            <Label>Trạng thái</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {integration.enabled ? "Đang bật" : "Tắt"}
              </span>
              <Switch
                checked={integration.enabled}
                onCheckedChange={toggleEnabled}
                disabled={updateEnabledMutation.isPending}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={integration.webhook_url}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyUrl}
              >
                {urlCopied ? (
                  <CheckIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Dán URL này vào trang cài đặt webhook của dịch vụ bên ngoài.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>{def.secretLabel}</Label>
            <div className="flex gap-2">
              <Input
                type={showSecret ? "text" : "password"}
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowSecret((v) => !v)}
              >
                {showSecret ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regenerateSecret}
                title="Tạo secret ngẫu nhiên"
              >
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{def.secretHint}</p>
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <ConfirmDialog
            title="Xóa tích hợp?"
            description="Webhook URL này sẽ ngừng hoạt động. Bạn có thể tạo lại tích hợp bất kỳ lúc nào."
            onConfirm={handleDelete}
          >
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
            >
              <Trash2Icon className="h-4 w-4 mr-2" />
              Xóa tích hợp
            </Button>
          </ConfirmDialog>
          <LoadingButton
            size="sm"
            loading={updateMutation.isPending}
            onClick={saveSecret}
            disabled={secretInput === integration.secret}
          >
            Lưu
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
