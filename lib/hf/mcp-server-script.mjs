import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const HF_TOKEN = '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';
const HF_URL = 'https://huggingface.co';
const HF_API = `${HF_URL}/api`;
const LOCAL_EDITOR_BASE = '/tmp/hf-editor';

function hfHeaders() {
        return { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' };
}

async function hfGet(path) {
        const res = await fetch(`${HF_API}${path}`, { headers: hfHeaders() });
        if (!res.ok) throw new Error(`HF API ${res.status}: ${await res.text()}`);
        return res.json();
}

async function hfPost(path, body) {
        const res = await fetch(`${HF_API}${path}`, {
                method: 'POST',
                headers: hfHeaders(),
                body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HF API ${res.status}: ${await res.text()}`);
        return res.json();
}

async function hfPut(path, body) {
        const res = await fetch(`${HF_API}${path}`, {
                method: 'PUT',
                headers: hfHeaders(),
                body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HF API ${res.status}: ${await res.text()}`);
        return res.json();
}

async function hfDelete(path, body) {
        const res = await fetch(`${HF_API}${path}`, {
                method: 'DELETE',
                headers: hfHeaders(),
                body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HF API ${res.status}: ${await res.text()}`);
        const text = await res.text();
        try { return JSON.parse(text); } catch { return { ok: true }; }
}

async function hf_model_files({ model_id, path = '' } = {}) {
        const info = await hfGet(`/models/${model_id}/tree/main${path ? '/' + path : ''}`);
        return { model_id, files: info.slice(0, 50).map((f) => ({ path: f.path, size: f.size, type: f.type })) };
}

async function hf_create_space({ name, sdk, private: isPrivate = false, license = 'mit', description = '' } = {}) {
        const me = await hfGet('/whoami-v2');
        const repoId = `${me.name}/${name}`;

        await hfPost('/repos/create', {
                type: 'space',
                name,
                private: isPrivate,
                sdk,
                license
        });

        if (description) {
                const readme = `---\ntitle: ${name}\nsdk: ${sdk}\nsdkVersion: latest\nlicense: ${license}\n---\n\n# ${name}\n\n${description}\n`;
                await _commitFile('space', repoId, 'README.md', readme, 'Initial commit');
        }

        return { ok: true, space_id: repoId, url: `${HF_URL}/spaces/${repoId}` };
}

async function hf_edit_space_file({ space_id, path, content, commit_message } = {}) {
        await _commitFile('space', space_id, path, content, commit_message ?? `Update ${path}`);
        return { ok: true, space_id, path, url: `${HF_URL}/spaces/${space_id}/blob/main/${path}` };
}

async function hf_space_files({ space_id } = {}) {
        const files = await hfGet(`/spaces/${space_id}/tree/main`);
        return {
                space_id,
                files: files.slice(0, 100).map((f) => ({ path: f.path, size: f.size, type: f.type })),
                url: `${HF_URL}/spaces/${space_id}`
        };
}

async function hf_delete_space_file({ space_id, path, commit_message } = {}) {
        const res = await fetch(`${HF_API}/spaces/${space_id}/commit/main`, {
                method: 'POST',
                headers: hfHeaders(),
                body: JSON.stringify({
                        summary: commit_message ?? `Delete ${path}`,
                        operations: [{ operation: 'delete', path }]
                })
        });
        if (!res.ok) throw new Error(`HF commit ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { ok: true, space_id, path, commitOid: data.commitOid };
}

async function hf_delete_space({ space_id } = {}) {
        const bareName = space_id.includes('/') ? space_id.split('/')[1] : space_id;
        await hfDelete('/repos/delete', { type: 'space', name: bareName });
        return { ok: true, space_id };
}

async function hf_space_runtime({ space_id } = {}) {
        const data = await hfGet(`/spaces/${space_id}/runtime`);
        return {
                space_id,
                stage: data.stage,
                hardware: data.hardware?.current ?? data.hardware?.requested ?? null,
                hardware_requested: data.hardware?.requested ?? null,
                gc_timeout: data.gcTimeout ?? null,
                url: `${HF_URL}/spaces/${space_id}`
        };
}

async function hf_restart_space({ space_id, factory_reboot = false } = {}) {
        const url = `${HF_API}/spaces/${space_id}/restart${factory_reboot ? '?factory=true' : ''}`;
        const res = await fetch(url, { method: 'POST', headers: hfHeaders() });
        if (!res.ok) throw new Error(`HF API ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { ok: true, space_id, stage: data.stage };
}

async function hf_space_settings({ space_id, private: isPrivate, hardware } = {}) {
        const body = {};
        if (isPrivate !== undefined) body.private = isPrivate;
        if (hardware !== undefined) body.hardware = hardware;
        if (Object.keys(body).length === 0) throw new Error('Provide at least one setting to update: private or hardware');
        await hfPut(`/spaces/${space_id}/settings`, body);
        return { ok: true, space_id, updated: body };
}

async function hf_upload_file({ repo_id, repo_type = 'model', path, content, commit_message } = {}) {
        await _commitFile(repo_type, repo_id, path, content, commit_message ?? `Upload ${path}`);
        return { ok: true, repo_id, path };
}

async function _commitFile(repoType, repoId, filePath, content, summary) {
        const contentBase64 = Buffer.from(content, 'utf8').toString('base64');
        const typeSegment = repoType === 'space' ? 'spaces' : repoType === 'dataset' ? 'datasets' : 'models';
        const res = await fetch(`${HF_API}/${typeSegment}/${repoId}/commit/main`, {
                method: 'POST',
                headers: hfHeaders(),
                body: JSON.stringify({
                        summary,
                        operations: [{ operation: 'addOrUpdate', path: filePath, content: contentBase64 }]
                })
        });
        if (!res.ok) throw new Error(`HF commit ${res.status}: ${await res.text()}`);
        return res.json();
}

async function _commitFiles(repoType, repoId, files, summary) {
        const typeSegment = repoType === 'space' ? 'spaces' : repoType === 'dataset' ? 'datasets' : 'models';
        const operations = files.map((f) => ({
                operation: 'addOrUpdate',
                path: f.path,
                content: Buffer.from(f.content, 'utf8').toString('base64')
        }));
        const res = await fetch(`${HF_API}/${typeSegment}/${repoId}/commit/main`, {
                method: 'POST',
                headers: hfHeaders(),
                body: JSON.stringify({ summary, operations })
        });
        if (!res.ok) throw new Error(`HF commit ${res.status}: ${await res.text()}`);
        return res.json();
}

function _workspacePath(workspace) {
        const safe = workspace.replace(/[^a-zA-Z0-9_\-]/g, '_');
        return path.join(LOCAL_EDITOR_BASE, safe);
}

function _listFilesRecursive(dir, base = '') {
        const results = [];
        if (!fs.existsSync(dir)) return results;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const rel = base ? `${base}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                        results.push(..._listFilesRecursive(path.join(dir, entry.name), rel));
                } else {
                        const fullPath = path.join(dir, entry.name);
                        results.push({ path: rel, size: fs.statSync(fullPath).size });
                }
        }
        return results;
}

async function hf_local_write({ workspace, path: filePath, content } = {}) {
        const wsDir = _workspacePath(workspace);
        const fullPath = path.join(wsDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
        return { ok: true, workspace, path: filePath, size: Buffer.byteLength(content, 'utf8') };
}

async function hf_local_read({ workspace, path: filePath } = {}) {
        const fullPath = path.join(_workspacePath(workspace), filePath);
        if (!fs.existsSync(fullPath)) return { ok: false, error: 'File not found' };
        const content = fs.readFileSync(fullPath, 'utf8');
        return { ok: true, workspace, path: filePath, content };
}

async function hf_local_list({ workspace } = {}) {
        const wsDir = _workspacePath(workspace);
        const files = _listFilesRecursive(wsDir);
        return { ok: true, workspace, files, total: files.length };
}

async function hf_local_push({ workspace, space_id, commit_message } = {}) {
        const wsDir = _workspacePath(workspace);
        const fileList = _listFilesRecursive(wsDir);
        if (fileList.length === 0) throw new Error('Workspace is empty — write files first with hf_local_write');

        const repoUrl = `https://user:${HF_TOKEN}@huggingface.co/spaces/${space_id}`;
        const safeWs = workspace.replace(/[^a-zA-Z0-9_-]/g, '_');
        const cloneDir = `/tmp/hf-git-${safeWs}-${Date.now()}`;

        const gitEnv = {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0',
                GIT_ASKPASS: 'echo',
                HOME: '/tmp',
                GIT_CONFIG_NOSYSTEM: '1'
        };

        const git = (cmd, opts = {}) =>
                execSync(cmd, { env: gitEnv, timeout: 60000, stdio: 'pipe', ...opts });

        try {
                git(`git clone --depth=1 "${repoUrl}" "${cloneDir}"`);

                for (const f of fileList) {
                        const src = path.join(wsDir, f.path);
                        const dst = path.join(cloneDir, f.path);
                        fs.mkdirSync(path.dirname(dst), { recursive: true });
                        fs.copyFileSync(src, dst);
                }

                git(`git -C "${cloneDir}" config user.email "ai-agent@hf.local"`);
                git(`git -C "${cloneDir}" config user.name "AI Agent"`);
                git(`git -C "${cloneDir}" add -A`);

                const status = git(`git -C "${cloneDir}" status --porcelain`).toString().trim();
                if (!status) {
                        return { ok: true, workspace, space_id, files_pushed: fileList.map((f) => f.path), note: 'No changes to commit', url: `${HF_URL}/spaces/${space_id}` };
                }

                const msg = (commit_message ?? `Push ${fileList.length} files from AI agent`).replace(/"/g, '\\"');
                git(`git -C "${cloneDir}" commit -m "${msg}"`);

                const branch = git(`git -C "${cloneDir}" rev-parse --abbrev-ref HEAD`).toString().trim();
                git(`git -C "${cloneDir}" push origin ${branch}`);

                return { ok: true, workspace, space_id, files_pushed: fileList.map((f) => f.path), branch, url: `${HF_URL}/spaces/${space_id}` };
        } finally {
                try { git(`rm -rf "${cloneDir}"`); } catch {}
        }
}

async function hf_inference({ model_id, inputs, parameters = {} } = {}) {
        const res = await fetch(`https://api-inference.huggingface.co/models/${model_id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs, parameters })
        });
        if (!res.ok) return { ok: false, error: await res.text(), status: res.status };
        return { ok: true, result: await res.json() };
}

async function hf_list_my_repos({ type = 'all' } = {}) {
        const me = await hfGet('/whoami-v2');
        const username = me.name;
        const result = {};

        if (type === 'model' || type === 'all') {
                const data = await hfGet(`/models?author=${username}&limit=20`);
                result.models = data.map((m) => ({ id: m.id, likes: m.likes ?? 0, private: m.private ?? false, url: `${HF_URL}/${m.id}` }));
        }
        if (type === 'dataset' || type === 'all') {
                const data = await hfGet(`/datasets?author=${username}&limit=20`);
                result.datasets = data.map((d) => ({ id: d.id, likes: d.likes ?? 0, private: d.private ?? false, url: `${HF_URL}/datasets/${d.id}` }));
        }
        if (type === 'space' || type === 'all') {
                const data = await hfGet(`/spaces?author=${username}&limit=20`);
                result.spaces = data.map((s) => ({ id: s.id, likes: s.likes ?? 0, sdk: s.sdk ?? null, private: s.private ?? false, url: `${HF_URL}/spaces/${s.id}` }));
        }

        return result;
}

async function hf_read_file({ repo_id, path, repo_type = 'model' } = {}) {
        const prefix = repo_type === 'dataset' ? 'datasets/' : repo_type === 'space' ? 'spaces/' : '';
        const url = `${HF_URL}/${prefix}${repo_id}/raw/main/${path}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${HF_TOKEN}` } });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, repo_id, path, content: (await res.text()).slice(0, 8000) };
}

const HANDLERS = {
        hf_model_files,
        hf_create_space,
        hf_edit_space_file,
        hf_space_files,
        hf_delete_space_file,
        hf_delete_space,
        hf_space_runtime,
        hf_restart_space,
        hf_space_settings,
        hf_upload_file,
        hf_inference,
        hf_list_my_repos,
        hf_read_file,
        hf_local_write,
        hf_local_read,
        hf_local_list,
        hf_local_push
};

const TOOL_DEFINITIONS = [
        { name: 'hf_model_files', description: 'List files in a model repository on HuggingFace Hub', inputSchema: { type: 'object', properties: { model_id: { type: 'string', description: 'Model ID e.g. google/gemma-2-9b' }, path: { type: 'string', description: 'Subdirectory path (optional)' } }, required: ['model_id'] } },
        { name: 'hf_create_space', description: 'Create a new Space on HuggingFace Hub', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Space name (without owner prefix)' }, sdk: { type: 'string', enum: ['gradio', 'streamlit', 'docker', 'static'] }, private: { type: 'boolean' }, license: { type: 'string' }, description: { type: 'string' } }, required: ['name', 'sdk'] } },
        { name: 'hf_edit_space_file', description: 'Create or edit a file in a HuggingFace Space (app.py, requirements.txt, README.md, etc)', inputSchema: { type: 'object', properties: { space_id: { type: 'string', description: 'Space ID e.g. owner/space-name' }, path: { type: 'string' }, content: { type: 'string' }, commit_message: { type: 'string' } }, required: ['space_id', 'path', 'content'] } },
        { name: 'hf_space_files', description: 'List all files in a HuggingFace Space repository', inputSchema: { type: 'object', properties: { space_id: { type: 'string', description: 'Space ID e.g. owner/space-name' } }, required: ['space_id'] } },
        { name: 'hf_delete_space_file', description: 'Delete a specific file from a HuggingFace Space', inputSchema: { type: 'object', properties: { space_id: { type: 'string', description: 'Space ID e.g. owner/space-name' }, path: { type: 'string', description: 'File path to delete e.g. app.py' }, commit_message: { type: 'string' } }, required: ['space_id', 'path'] } },
        { name: 'hf_delete_space', description: 'Permanently delete an entire HuggingFace Space', inputSchema: { type: 'object', properties: { space_id: { type: 'string', description: 'Space ID e.g. owner/space-name' } }, required: ['space_id'] } },
        { name: 'hf_space_runtime', description: 'Get the current runtime status of a HuggingFace Space (stage: RUNNING, STOPPED, BUILDING, ERROR, etc.)', inputSchema: { type: 'object', properties: { space_id: { type: 'string', description: 'Space ID e.g. owner/space-name' } }, required: ['space_id'] } },
        { name: 'hf_restart_space', description: 'Restart (wake up) a paused or sleeping HuggingFace Space', inputSchema: { type: 'object', properties: { space_id: { type: 'string', description: 'Space ID e.g. owner/space-name' }, factory_reboot: { type: 'boolean', description: 'Hard factory restart (clears cache)' } }, required: ['space_id'] } },
        { name: 'hf_space_settings', description: 'Update HuggingFace Space settings: visibility (public/private) or hardware tier', inputSchema: { type: 'object', properties: { space_id: { type: 'string', description: 'Space ID e.g. owner/space-name' }, private: { type: 'boolean', description: 'Set to true for private, false for public' }, hardware: { type: 'string', enum: ['cpu-basic', 'cpu-upgrade', 't4-small', 't4-medium', 'a10g-small', 'a10g-large', 'a100-large'], description: 'Hardware tier' } }, required: ['space_id'] } },
        { name: 'hf_upload_file', description: 'Upload a file to any HuggingFace repository', inputSchema: { type: 'object', properties: { repo_id: { type: 'string' }, repo_type: { type: 'string', enum: ['model', 'dataset', 'space'] }, path: { type: 'string' }, content: { type: 'string' }, commit_message: { type: 'string' } }, required: ['repo_id', 'repo_type', 'path', 'content'] } },
        { name: 'hf_inference', description: 'Run a model through HuggingFace Inference API', inputSchema: { type: 'object', properties: { model_id: { type: 'string' }, inputs: { type: 'string' }, parameters: { type: 'object' } }, required: ['model_id', 'inputs'] } },
        { name: 'hf_list_my_repos', description: 'List own repositories on HuggingFace Hub', inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['model', 'dataset', 'space', 'all'] } } } },
        { name: 'hf_read_file', description: 'Read a file from an HF repository (raw text)', inputSchema: { type: 'object', properties: { repo_id: { type: 'string' }, path: { type: 'string' }, repo_type: { type: 'string', enum: ['model', 'dataset', 'space'] } }, required: ['repo_id', 'path'] } },
        { name: 'hf_local_write', description: 'Write a file to the local editor workspace (before pushing to HF Space). Use this to create all files locally first, then push with hf_local_push.', inputSchema: { type: 'object', properties: { workspace: { type: 'string', description: 'Workspace name, e.g. space name' }, path: { type: 'string', description: 'File path, e.g. app.py or static/index.html' }, content: { type: 'string', description: 'Full file content' } }, required: ['workspace', 'path', 'content'] } },
        { name: 'hf_local_read', description: 'Read a file from the local editor workspace', inputSchema: { type: 'object', properties: { workspace: { type: 'string', description: 'Workspace name' }, path: { type: 'string', description: 'File path' } }, required: ['workspace', 'path'] } },
        { name: 'hf_local_list', description: 'List all files in the local editor workspace', inputSchema: { type: 'object', properties: { workspace: { type: 'string', description: 'Workspace name' } }, required: ['workspace'] } },
        { name: 'hf_local_push', description: 'Push all files from the local editor workspace to a HuggingFace Space in a single commit. Always use this after writing files with hf_local_write.', inputSchema: { type: 'object', properties: { workspace: { type: 'string', description: 'Workspace name' }, space_id: { type: 'string', description: 'Space ID e.g. owner/space-name' }, commit_message: { type: 'string', description: 'Git commit message' } }, required: ['workspace', 'space_id'] } }
];

const server = new Server(
        { name: 'hf-custom-mcp-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
        const { name, arguments: args } = req.params;
        const handler = HANDLERS[name];
        if (!handler) throw new Error(`Unknown tool: ${name}`);
        try {
                const result = await handler(args ?? {});
                return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (e) {
                return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }) }], isError: true };
        }
});

const transport = new StdioServerTransport();
await server.connect(transport);
