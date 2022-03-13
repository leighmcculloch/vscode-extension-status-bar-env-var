import * as vscode from 'vscode';

const envVarNamesConfig = "statusBarEnvVar.environmentVariableNames";
const commandName = "statusBarEnvVar.setEnvVarValue";

export function activate({ subscriptions }: vscode.ExtensionContext) {
	var envVars: Map<string, {sbarItem: vscode.StatusBarItem,  options?: Array<string>}> = new Map();
	subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration(envVarNamesConfig)) {
			updateStatusBarItems(subscriptions, envVars);
		}
	}));

	subscriptions.push(vscode.commands.registerCommand(
		commandName,
		(envVarName?: string) => {
			(async (): Promise<string | undefined> => {
				if (!envVarName) {
					envVarName = await vscode.window.showQuickPick(Array.from(envVars.keys()), {
						title: "Select environmental variable name",
						canPickMany: false
					} as vscode.QuickPickOptions);
				}
				return envVarName;
			})().then((envVarName?: string) => {
				if (envVarName) {
					var envVar = envVars.get(envVarName);
					if (envVar) {
						setEnvVar(envVarName, envVar.options).then(() => {
							if (envVar) {
								envVar.sbarItem.text = `${envVarName}=${process.env[envVarName as string]}`;
							}
						});
					}
				}
			});
		}
	));

	updateStatusBarItems(subscriptions, envVars);
}

async function setEnvVar(envVarName: string, options?: Array<string>) {
	const prompt = `Set ${envVarName} to`;
	let value = options?
		await vscode.window.showQuickPick(options, {
			title: prompt,
			canPickMany: false
		} as vscode.QuickPickOptions) :
		await vscode.window.showInputBox({
			prompt: prompt,
			value: process.env[envVarName]
		});
	
	if (value) {
		process.env[envVarName] = value;
	}
}

function updateStatusBarItems(subscriptions: vscode.ExtensionContext["subscriptions"], envVars: Map<string, {sbarItem: vscode.StatusBarItem,  options?: Array<string>}>) {
	if (envVars.size > 0) {
		envVars.forEach((envVar) => {
			envVar.sbarItem.dispose();
		});
		envVars.clear();
	}
	const envVarList = vscode.workspace.getConfiguration().get(envVarNamesConfig) as Array<string>;
	if (!envVarList) {
		return;
	}

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
		statusBarItem.text = `${envVarName}=${process.env[envVarName]}`;

		
		statusBarItem.command = {
			command: commandName,
			arguments: [envVarName, options, statusBarItem]
		} as vscode.Command;

		subscriptions.push(statusBarItem);
		envVars.set(envVarName, {sbarItem: statusBarItem, options: options});

		statusBarItem.show();
	});
}

export function deactivate() { }
