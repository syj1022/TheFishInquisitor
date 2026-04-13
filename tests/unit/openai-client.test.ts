// abstract: Unit tests for OpenAI prompt client request and JSON extraction behavior.
// out_of_scope: Prompt schema validation and component integration concerns.

import { createOpenAIPromptClient } from "../../src/lib/parser/openaiClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("extracts JSON from OpenAI chat response", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: '{"handId":"h1","players":[],"potSize":3,"actions":[]}'
          }
        }
      ]
    })
  });

  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

  const client = createOpenAIPromptClient({ apiKey: "sk-test" });
  const result = (await client.extract("parse this hand")) as { handId: string };

  expect(result.handId).toBe("h1");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
