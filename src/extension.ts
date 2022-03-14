import * as vscode from 'vscode';

type EnvVarMap = Map<string, {
	sbarItem: vscode.StatusBarItem, 
	options?: Array<string>
}>;

const envVarNamesConfig = "statusBarEnvVar.environmentVariableNames";
const commandName = "statusBarEnvVar.setEnvVarValue";

export function activate(context: vscode.ExtensionContext) {
	var envVars: EnvVarMap = new Map();
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration(envVarNamesConfig)) {
			updateStatusBarItems(context, envVars);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand(
		commandName,
		(envVarName?: string) => {
			(async (): Promise<string> => {
				if (!envVarName) {
					envVarName = await vscode.window.showQuickPick(
						Array.from(envVars.keys()), {
							title: "Select environmental variable name",
							canPickMany: false
						}
					);
				}
				if (!envVarName) {
					throw new Error("Env var selection cancelled");
				}
				return Promise.resolve(envVarName);
			})().then((envVarName: string) => {
				var envVar = envVars.get(envVarName);
				var value = context.environmentVariableCollection.get(envVarName)?.value;
				setEnvVar(envVarName, value, envVar?.options).then((value: string) => {
					if (envVar) {
						context.environmentVariableCollection.replace(envVarName, value);
						envVar.sbarItem.text = `${envVarName}=${value}`;
					}
				})
				.catch(() => {});
			});
		}
	));

	updateStatusBarItems(context, envVars);
}

async function setEnvVar(envVarName: string, value?: string, options?: Array<string>): Promise<string> {
	const prompt = `Set ${envVarName} to`;
	let val = options ?
		await vscode.window.showQuickPick(options, {
			title: prompt,
			canPickMany: false
		}):
		await vscode.window.showInputBox({
			prompt: prompt,
			value: value
		});

	if (val) {
		return val;
	}
	throw new Error("Set env var cancelled");
}

function updateStatusBarItems(context: vscode.ExtensionContext, envVars: EnvVarMap) {
	if (envVars.size > 0) {
		envVars.forEach((envVar) => {
			envVar.sbarItem.dispose();
		});
		envVars.clear();
	}
	const envVarList = vscode.workspace.getConfiguration().get<Array<string>>(envVarNamesConfig) ?? [];

	envVarList.forEach(envVar => {
		let statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		let t: Array<string>;

		let options: Array<string> | undefined;
		t = envVar.split("#");
		statusBarItem.tooltip = (t.length > 1) ? t[1].trim() : "";

		t = t[0].split("[");
		options = (t.length > 1) ?
			t[1].split("]")[0].trim().split(",").map((o: string): string => o.trim()):
			undefined;

		let envVarName: string = t[0].trim();

		// Allow the process env to overwrite the cached env var values.
		// Note this only happens on extension activation and when settings are
		// overwritten.
		let value = process.env[envVarName];
		if (value) {
			context.environmentVariableCollection.replace(envVarName, value);
		} else {
			value = context.environmentVariableCollection.get(envVarName)?.value;
		}
		statusBarItem.text = `${envVarName}=${value}`;

		let c: vscode.Command = {
			title: `Set value of ${envVarName}`,
			command: commandName,
			arguments: [envVarName, options, statusBarItem]
		};
		statusBarItem.command = c;

		context.subscriptions.push(statusBarItem);
		envVars.set(envVarName, {sbarItem: statusBarItem, options: options});

		statusBarItem.show();
	});
}

export function deactivate() { }
