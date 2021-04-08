import * as vscode from 'vscode';

const envVarNamesConfig = 'statusBarEnvVar.environmentVariableNames';

let statusBarItem: vscode.StatusBarItem;

export function activate({ subscriptions }: vscode.ExtensionContext) {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	subscriptions.push(statusBarItem);

	subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration(envVarNamesConfig)) {
			updateStatusBarItem();
		}
	}));

	updateStatusBarItem();
}

function updateStatusBarItem() {
	const envVarNamesList = vscode.workspace.getConfiguration().get(envVarNamesConfig) as string;
	if (!envVarNamesList) {
		return;
	}

	const envVarNames = envVarNamesList.split(",");

	statusBarItem.text = envVarNames
		.map((n: string): string => `${n}=${process.env[n] || ""}`)
		.join(" ");

	statusBarItem.show();
}

export function deactivate() { }
