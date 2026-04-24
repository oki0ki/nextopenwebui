import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'path';
import { HF_TOKEN } from './tools.js';

const CUSTOM_SCRIPT = join(process.cwd(), 'src/lib/hf/mcp-server-script.mjs');
const OFFICIAL_BIN = join(process.cwd(), 'node_modules/.bin/hf-mcp-server');

const OFFICIAL_TOOLS = new Set([
        'hf_whoami',
        'space_search',
        'model_search',
        'hub_repo_search',
        'model_details',
        'paper_search',
        'dataset_search',
        'dataset_details',
        'hub_repo_details',
        'duplicate_space',
        'space_info',
        'space_files',
        'hf_doc_search',
        'hf_doc_fetch',
        'use_space',
        'hf_jobs',
        'dynamic_space',
        'gr1_z_image_turbo_generate'
]);

export interface ToolCall {
        id: string;
        name: string;
        arguments: Record<string, unknown>;
}

export interface ToolResult {
        tool_call_id: string;
        name: string;
        content: string;
}

async function callOfficialHFTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
        const transport = new StdioClientTransport({
                command: OFFICIAL_BIN,
                args: [],
                env: { ...process.env, HF_TOKEN, DEFAULT_HF_TOKEN: HF_TOKEN, NODE_ENV: 'production' },
                stderr: 'pipe'
        });

        const client = new Client(
                { name: 'hf-official-client', version: '1.0.0' },
                { capabilities: {} }
        );

        await client.connect(transport);

        try {
                return await Promise.all(
                        toolCalls.map(async (tc) => {
                                const result = await client.callTool({ name: tc.name, arguments: tc.arguments });
                                const text =
                                        Array.isArray(result.content) && result.content.length > 0 && result.content[0].type === 'text'
                                                ? (result.content[0] as { type: 'text'; text: string }).text
                                                : JSON.stringify(result.content);
                                return { tool_call_id: tc.id, name: tc.name, content: text };
                        })
                );
        } finally {
                await client.close();
        }
}

async function callCustomHFTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
        const transport = new StdioClientTransport({
                command: 'node',
                args: [CUSTOM_SCRIPT],
                stderr: 'pipe'
        });

        const client = new Client(
                { name: 'hf-custom-client', version: '1.0.0' },
                { capabilities: {} }
        );

        await client.connect(transport);

        try {
                return await Promise.all(
                        toolCalls.map(async (tc) => {
                                const result = await client.callTool({ name: tc.name, arguments: tc.arguments });
                                const text =
                                        Array.isArray(result.content) && result.content.length > 0 && result.content[0].type === 'text'
                                                ? (result.content[0] as { type: 'text'; text: string }).text
                                                : JSON.stringify(result.content);
                                return { tool_call_id: tc.id, name: tc.name, content: text };
                        })
                );
        } finally {
                await client.close();
        }
}

export async function callHFToolsMCP(toolCalls: ToolCall[]): Promise<ToolResult[]> {
        const officialCalls = toolCalls.filter((tc) => OFFICIAL_TOOLS.has(tc.name));
        const customCalls = toolCalls.filter((tc) => !OFFICIAL_TOOLS.has(tc.name));

        const [officialResults, customResults] = await Promise.all([
                officialCalls.length > 0 ? callOfficialHFTools(officialCalls) : Promise.resolve([]),
                customCalls.length > 0 ? callCustomHFTools(customCalls) : Promise.resolve([])
        ]);

        const resultMap = new Map<string, ToolResult>();
        for (const r of [...officialResults, ...customResults]) {
                resultMap.set(r.tool_call_id, r);
        }

        return toolCalls.map((tc) => resultMap.get(tc.id)!);
}
