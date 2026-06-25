import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Button, Card, FieldLabel, Input, Label, Separator, Textarea } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { ConnectJudgesFormHeader } from "./ConnectJudgesFormHeader.js";
import { formatConnectJudgeError } from "./connectJudgeErrors.js";
import type { ProviderConnectJudgeFormProps } from "./connectJudgesShared.js";
import { CodeforcesIcon } from "./JudgeDisplay.js";
import { useToaster } from "./Toaster.js";
import { trpc } from "./trpc.js";

export function CodeforcesConnectJudgeForm({
  onChangeProvider
}: ProviderConnectJudgeFormProps): React.JSX.Element {
  const navigate = useNavigate();
  const { setCredentialStatus } = useConnectedJudges();
  const toaster = useToaster();

  const form = useForm({
    defaultValues: {
      handle: "",
      apiKey: "",
      apiSecret: ""
    },
    onSubmit: async ({ value }) => {
      try {
        const status = await trpc.credentials.create.mutate({
          provider: "codeforces",
          providerUserKey: value.handle,
          codeforces: {
            apiKey: value.apiKey,
            apiSecret: value.apiSecret
          }
        });
        setCredentialStatus(status);
        void navigate({ to: "/judges" });
      } catch (error) {
        toaster.error({
          title: "Could not connect Codeforces",
          description: formatConnectJudgeError(error)
        });
      }
    }
  });

  return (
    <Card className="overflow-hidden">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <ConnectJudgesFormHeader
              title="Codeforces"
              icon={<CodeforcesIcon className="size-4" aria-hidden="true" />}
              disabled={isSubmitting}
              onChangeProvider={onChangeProvider}
            />
          )}
        </form.Subscribe>
        <Separator />

        <div className="space-y-4 p-5">
          <form.Field name="handle">
            {(field) => (
              <Label>
                <FieldLabel>Handle</FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="tourist"
                  autoComplete="username"
                  disabled={form.state.isSubmitting}
                  required
                />
              </Label>
            )}
          </form.Field>

          <div className="space-y-3">
            <form.Field name="apiKey">
              {(field) => (
                <Label>
                  <FieldLabel>API key</FieldLabel>
                  <Textarea
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Codeforces API key"
                    autoComplete="off"
                    spellCheck={false}
                    className="min-h-20 font-mono text-xs leading-relaxed"
                    disabled={form.state.isSubmitting}
                    required
                  />
                </Label>
              )}
            </form.Field>
            <form.Field name="apiSecret">
              {(field) => (
                <Label>
                  <FieldLabel>API secret</FieldLabel>
                  <Textarea
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Codeforces API secret"
                    autoComplete="off"
                    spellCheck={false}
                    className="min-h-20 font-mono text-xs leading-relaxed"
                    disabled={form.state.isSubmitting}
                    required
                  />
                </Label>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Enter
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </Card>
  );
}
