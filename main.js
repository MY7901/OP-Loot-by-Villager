import { world, system, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, PlayerPermissionLevel } from "@minecraft/server";

// DynamicPropertyのキー
const BABY_DROP_PROPERTY = "ma:olbv_babyDropEnabled"; // ワールド全体の設定
const BABY_DROP_APPLY_ALL_PROPERTY = "ma:olbv_babyDropApplyAll"; // ワールドごとかプレイヤーごとか
const NBT_DROP_PROPERTY = "ma:olbv_nbtDropEnabled"; // NBTアイテムのドロップ設定
const PLAYER_BABY_DROP_PROPERTY = "ma:olbv_playerBabyDrop_"; // プレイヤーごとの設定プレフィックス

// 変数の宣言（初期化はworldLoadで）
let babyDropApplyAll;
let babyDropEnabled;
let nbtDropEnabled;

// プレイヤーごとの設定を管理するMap
const playerBabyDropSettings = new Map();

// ワールドロード後にプロパティを読み込む
world.afterEvents.worldLoad.subscribe(() => {
    system.runTimeout(() => {
        try {
            babyDropApplyAll = world.getDynamicProperty(BABY_DROP_APPLY_ALL_PROPERTY) ?? true; // デフォルト: プレイヤーごと
            babyDropEnabled = world.getDynamicProperty(BABY_DROP_PROPERTY) ?? true; // ワールド全体のデフォルト: true
            nbtDropEnabled = world.getDynamicProperty(NBT_DROP_PROPERTY) ?? true; // NBTドロップのデフォルト: true
            console.log("[op_loot_by_villager] Dynamic properties initialized");
        } catch (error) {
            console.warn("[op_loot_by_villager] Dynamic property initialization error:", error.message);
        }
    }, 20);
});

// プレイヤーがOP権限を持つかチェックする関数
function hasOpPermission(player) {
    return player.playerPermissionLevel >= PlayerPermissionLevel.Operator;
}

// プレイヤーごとのbabyDrop設定を取得
function getPlayerBabyDropSetting(player) {
    if (babyDropApplyAll) {
        const property = world.getDynamicProperty(`${PLAYER_BABY_DROP_PROPERTY}${player.id}`);
        return property !== undefined ? property : true; // デフォルト: true
    }
    return babyDropEnabled; // ワールド全体の設定を返す
}

// プレイヤーごとのbabyDrop設定を保存
function savePlayerBabyDropSetting(player, value) {
    try {
        world.setDynamicProperty(`${PLAYER_BABY_DROP_PROPERTY}${player.id}`, value);
        playerBabyDropSettings.set(player.id, value);
        player.sendMessage(`§a子ども村人がドロップする設定を${value ? "有効" : "無効"}にしました。`);
    } catch (error) {
        console.warn("[op_loot_by_villager] savePlayerBabyDropSetting error:", error.message);
        if (player) {
            player.sendMessage("§c設定保存中にエラーが発生しました。");
        }
    }
}

// ワールド全体のbabyDrop設定を保存
function saveBabyDropSetting(value, source) {
    try {
        babyDropEnabled = value;
        world.setDynamicProperty(BABY_DROP_PROPERTY, value);
        if (source) {
            source.sendMessage(`§a子ども村人がドロップする設定を${value ? "有効" : "無効"}にしました。`);
        }
    } catch (error) {
        console.warn("[op_loot_by_villager] saveBabyDropSetting error:", error.message);
        if (source) {
            source.sendMessage("§c設定保存中にエラーが発生しました。");
        }
    }
}

// bd_aap設定を保存
function saveBabyDropApplyAllSetting(value, source) {
    try {
        babyDropApplyAll = value;
        world.setDynamicProperty(BABY_DROP_APPLY_ALL_PROPERTY, value);
        if (source) {
            source.sendMessage(`§a子ども村人のドロップ設定を${value ? "プレイヤーごと (true)" : "ワールドごと (false)"}に設定しました。`);
        }
        // ワールドごと設定に切り替える場合、プレイヤーごとの設定をクリア
        if (!value) {
            for (const player of world.getAllPlayers()) {
                world.setDynamicProperty(`${PLAYER_BABY_DROP_PROPERTY}${player.id}`, undefined);
                playerBabyDropSettings.delete(player.id);
            }
        }
    } catch (error) {
        console.warn("[op_loot_by_villager] saveBabyDropApplyAllSetting error:", error.message);
        if (source) {
            source.sendMessage("§c設定保存中にエラーが発生しました。");
        }
    }
}

// nbt_drop設定を保存
function saveNbtDropSetting(value, source) {
    try {
        nbtDropEnabled = value;
        world.setDynamicProperty(NBT_DROP_PROPERTY, value);
        if (source) {
            source.sendMessage(`§aNBTアイテムのドロップを${value ? "有効" : "無効"}にしました。`);
        }
    } catch (error) {
        console.warn("[op_loot_by_villager] saveNbtDropSetting error:", error.message);
        if (source) {
            source.sendMessage("§c設定保存中にエラーが発生しました。");
        }
    }
}

// 村人に一番近いプレイヤーを見つける関数
function findNearestPlayer(location) {
    const players = world.getPlayers();
    let nearestPlayer = null;
    let nearestDistance = Infinity;

    for (const player of players) {
        const playerLocation = player.location;
        const distance = Math.sqrt(
            Math.pow(playerLocation.x - location.x, 2) +
            Math.pow(playerLocation.y - location.y, 2) +
            Math.pow(playerLocation.z - location.z, 2)
        );
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPlayer = player;
        }
    }
    return nearestPlayer;
}

// アイテム名を取得する関数（構造名から装飾付きアイテム名に変換）
function getItemName(structureName) {
    const itemMap = {
        "arrow": "§l§gや〜§r§f",
        "spyglass": "§l§gよく見え〜る§r§f",
        "hanabi": "§l§g花火楽しいな〜§r§f",
        "elytra": "§l§bNBTワールド§r§f §l§6飛行滑空システム§r§f §l§gきしめん§r§f",
        "fishing_hook1": "§l§g最強の絶対に壊れない釣竿§r§f",
        "fishing_hook2": "§l§b最強の絶対に壊れない魚用釣竿§r§f",
        "shield": "§l§g最強の盾§r§f",
        "trident1": "§l§b最強の激流トライデント§r§f",
        "trident2": "§l§b最強の召雷トライデント§r§f",
        "powder_snow_boots": "§l§a対§r§f§l§f粉雪§r§f§l§gブーツ§r§f",
        "piglin_helmet": "§l§a対§r§f§l§eピグリン§r§f§l§gヘルメット§r§f",
        "frost_walker_boots": "§l§b氷渡り§r§f§l§gブーツ§r§f",
        "piglin_chestplate": "§l§a対§r§f§l§eピグリン§r§f§l§gチェストプレート§r§f",
        "saikyou_bow": "§l§8Ancient§r§f §l§aSuper§r§f §l§dBow§r§f",
        "saikyou_sword": "§l§bInfinity§r§f §l§5Blade§r§f",
        "saikyou_helmet": "§l§g最強ヘルメット§r§f",
        "saikyou_chestplate": "§l§g最強チェストプレート§r§f",
        "saikyou_leggings": "§l§g最強レギンス§r§f",
        "saikyou_boots": "§l§g最強ブーツ§r§f",
        "inventory_box": "§l§bインベントリボックス§r§f",
        "ender_chest_box": "§l§aエンダーチェストボックス§r§f"
    };
    return itemMap[structureName] || "不明なアイテム";
}

// カスタムコマンドの登録
system.beforeEvents.startup.subscribe((event) => {
    try {
        const commandRegistry = event.customCommandRegistry;

        // enumの定義
        commandRegistry.registerEnum("ma:olbv_action", ["baby_drop", "bd_aap", "nbt_drop"]);

        // /ma:olbv_settings コマンド
        commandRegistry.registerCommand({
            name: "ma:olbv_settings",
            description: "OP Loot by Villagerアドオンの設定を変更します",
            permissionLevel: CommandPermissionLevel.Any, // 誰でも実行可能
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.Enum, name: "ma:olbv_action" }
            ],
            optionalParameters: [
                { type: CustomCommandParamType.Boolean, name: "enabled" }
            ]
        }, (source, action, enabled) => {
            const player = source.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                console.warn("[op_loot_by_villager] 無効なプレイヤー");
                return { status: CustomCommandStatus.Failure };
            }

            try {
                if (action === "baby_drop") {
                    if (enabled === undefined) {
                        // enabledが省略された場合、現在の設定を表示
                        const currentSetting = getPlayerBabyDropSetting(player);
                        player.sendMessage(`§a現在の子ども村人のドロップ設定: ${currentSetting ? "有効" : "無効"}`);
                        return { status: CustomCommandStatus.Success };
                    }
                    // bd_aapがfalseの場合、OP権限が必要
                    if (!babyDropApplyAll && !hasOpPermission(player)) {
                        player.sendMessage("§cワールドごと (false) の設定変更にはオペレーター権限が必要です。");
                        return { status: CustomCommandStatus.Failure };
                    }
                    if (babyDropApplyAll) {
                        // プレイヤーごとの設定を変更
                        savePlayerBabyDropSetting(player, enabled);
                        player.sendMessage(`§aあなたの子ども村人のドロップ設定を${enabled ? "有効" : "無効"}にしました。`);
                    } else {
                        // ワールド全体の設定を変更
                        saveBabyDropSetting(enabled, player);
                    }
                } else if (action === "bd_aap") {
                    if (enabled === undefined) {
                        // enabledが省略された場合、現在の設定を表示
                        player.sendMessage(`§a現在の子ども村人のドロップ設定モード: ${babyDropApplyAll ? "プレイヤーごと (true)" : "ワールドごと (false)"}`);
                        return { status: CustomCommandStatus.Success };
                    }
                    // bd_aapは常にOP権限が必要
                    if (!hasOpPermission(player)) {
                        player.sendMessage("§cこのコマンドを実行するにはオペレーター権限が必要です。");
                        return { status: CustomCommandStatus.Failure };
                    }
                    saveBabyDropApplyAllSetting(enabled, player);
                } else if (action === "nbt_drop") {
                    if (enabled === undefined) {
                        // enabledが省略された場合、現在の設定を表示
                        player.sendMessage(`§a現在のNBTアイテムのドロップ設定: ${nbtDropEnabled ? "有効" : "無効"}`);
                        return { status: CustomCommandStatus.Success };
                    }
                    // OP権限が必要
                    if (!hasOpPermission(player)) {
                        player.sendMessage("§cこのコマンドを実行するにはオペレーター権限が必要です。");
                        return { status: CustomCommandStatus.Failure };
                    }
                    saveNbtDropSetting(enabled, player);
                } else {
                    player.sendMessage("§c無効なアクションです。'baby_drop', 'bd_aap', 'nbt_drop' を指定してください。");
                    return { status: CustomCommandStatus.Failure };
                }
            } catch (error) {
                console.warn("[op_loot_by_villager] コマンドエラー:", error.message);
                player.sendMessage("§cコマンド実行中にエラーが発生しました。");
                return { status: CustomCommandStatus.Failure };
            }

            return { status: CustomCommandStatus.Success };
        });

        // /ma:olbv_info コマンド
        commandRegistry.registerCommand({
            name: "ma:olbv_info",
            description: "OP Loot by Villagerアドオンの現在の設定を表示します",
            permissionLevel: CommandPermissionLevel.Any, // 誰でも実行可能
            cheatsRequired: false,
            mandatoryParameters: [],
            optionalParameters: []
        }, (source) => {
            const player = source.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                console.warn("[op_loot_by_villager] 無効なプレイヤー");
                return { status: CustomCommandStatus.Failure };
            }

            try {
                player.sendMessage(`§e=== OP Loot by Villager 設定状況 ===`);
                player.sendMessage(`§a子ども村人のドロップ設定: ${babyDropApplyAll ? "プレイヤーごと (true)" : "ワールドごと (false)"}`);
                player.sendMessage(`§a子ども村人のドロップ: ${getPlayerBabyDropSetting(player) ? "有効" : "無効"}`);
                player.sendMessage(`§aNBTアイテムのドロップ: ${nbtDropEnabled ? "有効" : "無効"}`);
            } catch (error) {
                console.warn("[op_loot_by_villager] info コマンドエラー:", error.message);
                player.sendMessage("§c設定表示中にエラーが発生しました。");
                return { status: CustomCommandStatus.Failure };
            }

            return { status: CustomCommandStatus.Success };
        });

        // /ma:olbv_help コマンド
        commandRegistry.registerCommand({
            name: "ma:olbv_help",
            description: "OP Loot by Villagerアドオンのコマンド構文を表示します",
            permissionLevel: CommandPermissionLevel.Any, // 誰でも実行可能
            cheatsRequired: false,
            mandatoryParameters: [],
            optionalParameters: []
        }, (source) => {
            const player = source.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                console.warn("[op_loot_by_villager] 無効なプレイヤー");
                return { status: CustomCommandStatus.Failure };
            }

            try {
                player.sendMessage(`§e=== OP Loot by Villager コマンド一覧 ===`);
                player.sendMessage(`§a/ma:olbv_settings baby_drop [true|false] §7- 子ども村人のドロップを有効/無効にする（省略で現在の設定を表示）`);
                player.sendMessage(`§a/ma:olbv_settings bd_aap [true|false] §7- 子ども村人のドロップのプレイヤーごと (true) /ワールドごと (false) の設定を切り替え（省略で現在の設定を表示、OP権限必要）`);
                player.sendMessage(`§a/ma:olbv_settings nbt_drop [true|false] §7- NBTアイテムのドロップを有効/無効にする（省略で現在の設定を表示、OP権限必要）`);
                player.sendMessage(`§a/ma:olbv_info §7- 現在の設定を確認`);
                player.sendMessage(`§a/ma:olbv_help §7- コマンドの構文を表示`);
            } catch (error) {
                console.warn("[op_loot_by_villager] help コマンドエラー:", error.message);
                player.sendMessage("§cヘルプ表示中にエラーが発生しました。");
                return { status: CustomCommandStatus.Failure };
            }

            return { status: CustomCommandStatus.Success };
        });

        console.log("[op_loot_by_villager] カスタムコマンドの登録が完了しました");
    } catch (error) {
        console.warn("[op_loot_by_villager] コマンド登録エラー:", error.message);
    }
});

// エンティティがダメージを受けて死亡したときのイベントリスナー
world.afterEvents.entityDie.subscribe((eventData) => {
    // 死亡したエンティティが村人かどうかを確認
    if (eventData.deadEntity.typeId === "minecraft:villager_v2") {
        // 村人が子どもかどうかを確認
        const isBaby = eventData.deadEntity.hasComponent("minecraft:is_baby");
        // キラーがプレイヤーまたは狼であることを確認
        const killer = eventData.damageSource.damagingEntity;
        if (!killer || (killer.typeId !== "minecraft:player" && killer.typeId !== "minecraft:wolf")) return;

        // プレイヤーごとの設定を取得（プレイヤーまたは一番近いプレイヤー）
        let targetPlayer = killer.typeId === "minecraft:player" ? killer : findNearestPlayer(eventData.deadEntity.location);
        if (!targetPlayer) return; // プレイヤーが見つからない場合は処理を終了

        // 子ども村人で、設定が無効の場合は処理を終了
        if (isBaby && !getPlayerBabyDropSetting(targetPlayer)) {
            console.log("子ども村人がドロップしない設定のため、処理を終了しました。");
            return;
        }

        // 村人の位置を取得
        const location = eventData.deadEntity.location;
        const dimension = targetPlayer.dimension;

            try {
                // ゲームルールを設定（コマンドブロックの出力を非表示）
                dimension.runCommand("gamerule commandblockoutput false");
                dimension.runCommand("gamerule sendcommandfeedback false");
                console.log("Command block output and feedback disabled");

                // lootコマンドを実行
                const command = `loot spawn ${location.x} ${location.y} ${location.z} loot "entities/villager"`;
                dimension.runCommand(command);
                console.log(`Loot dropped for villager at ${location.x}, ${location.y}, ${location.z}`);

                // ロケット花火付与フラグ
                let fireworkGiven = false;
                let fireworkCount = 0;

                // 70%の確率でロケット花火を付与
                if (Math.random() < 0.7) {
                    fireworkGiven = true;
                    fireworkCount = Math.floor(Math.random() * (64 - 20 + 1)) + 20; // 20〜64のランダムな数量
                    const giveCommand = `give ${targetPlayer.name} firework_rocket ${fireworkCount} 3`;
                    dimension.runCommand(giveCommand);
                    console.log(`飛翔時間3のロケット花火を${fireworkCount}個、${targetPlayer.name}に付与しました！`);
                    dimension.runCommand(`playsound random.orb ${targetPlayer.name}`);
                    console.log("Played random.orb sound for firework give");
                    targetPlayer.sendMessage(`あなたに飛翔時間3のロケット花火を${fireworkCount}個与えました。`);
                    console.log(`Sent firework give message to ${targetPlayer.name}`);
                }

                // 35%の確率でコモンアイテム
                let commonItemDropped = false;
                let commonItemName = "";
                if (Math.random() < 0.35) {
                    const commonCommands = [
                        `structure load arrow ${location.x} ${location.y} ${location.z}`,
                        `structure load spyglass ${location.x} ${location.y} ${location.z}`,
                        `structure load hanabi ${location.x} ${location.y} ${location.z}`,
                        `structure load elytra ${location.x} ${location.y} ${location.z}`,
                        `structure load fishing_hook1 ${location.x} ${location.y} ${location.z}`,
                        `structure load fishing_hook2 ${location.x} ${location.y} ${location.z}`
                    ];
                    const randomCommonCommand = commonCommands[Math.floor(Math.random() * commonCommands.length)];
                    dimension.runCommand(randomCommonCommand);
                    commonItemDropped = true;
                    commonItemName = getItemName(randomCommonCommand.split(" ")[2]);
                    console.log("おめでとう！コモンアイテムがドロップしました！");
                    targetPlayer.sendMessage(`村人から§l§7${commonItemName}§r§fがドロップしました。`);
                    console.log(`Sent common item drop message to ${targetPlayer.name}`);
                }

                // 15%の確率でレアアイテム
                let rareItemDropped = false;
                let rareItemName = "";
                if (Math.random() < 0.15) {
                    const rareCommands = [
                        `structure load shield ${location.x} ${location.y} ${location.z}`,
                        `structure load trident1 ${location.x} ${location.y} ${location.z}`,
                        `structure load trident2 ${location.x} ${location.y} ${location.z}`
                    ];
                    const randomRareCommand = rareCommands[Math.floor(Math.random() * rareCommands.length)];
                    dimension.runCommand(randomRareCommand);
                    rareItemDropped = true;
                    rareItemName = getItemName(randomRareCommand.split(" ")[2]);
                    console.log("おめでとう！レアアイテムがドロップしました！");
                    targetPlayer.sendMessage(`村人から§l§b${rareItemName}§r§fがドロップしました。`);
                    console.log(`Sent rare item drop message to ${targetPlayer.name}`);
                }

                // 10%の確率でエピックアイテム
                let epicItemDropped = false;
                let epicItemName = "";
                if (Math.random() < 0.1) {
                    const epicCommands = [
                        `structure load powder_snow_boots ${location.x} ${location.y} ${location.z}`,
                        `structure load piglin_helmet ${location.x} ${location.y} ${location.z}`,
                        `structure load frost_walker_boots ${location.x} ${location.y} ${location.z}`,
                        `structure load piglin_chestplate ${location.x} ${location.y} ${location.z}`
                    ];
                    const randomEpicCommand = epicCommands[Math.floor(Math.random() * epicCommands.length)];
                    dimension.runCommand(randomEpicCommand);
                    epicItemDropped = true;
                    epicItemName = getItemName(randomEpicCommand.split(" ")[2]);
                    console.log("おめでとう！エピックアイテムがドロップしました！");
                    targetPlayer.sendMessage(`村人から${epicItemName}がドロップしました。`);
                    console.log(`Sent epic item drop message to ${targetPlayer.name}`);
                }

                // 5%の確率でレジェンドアイテム
                let bowOrSwordDropped = false;
                let bowOrSwordItemName = "";
                if (Math.random() < 0.05) {
                    const bowOrSwordCommands = [
                        `structure load saikyou_bow ${location.x} ${location.y} ${location.z}`,
                        `structure load saikyou_sword ${location.x} ${location.y} ${location.z}`
                    ];
                    const randomBowOrSwordCommand = bowOrSwordCommands[Math.floor(Math.random() * bowOrSwordCommands.length)];
                    dimension.runCommand(randomBowOrSwordCommand);
                    bowOrSwordDropped = true;
                    bowOrSwordItemName = getItemName(randomBowOrSwordCommand.split(" ")[2]);
                    console.log("おめでとう！Ancient Super BowまたはInfinity Bladeがドロップしました！");
                    if (fireworkGiven) {
                        system.runTimeout(() => {
                            targetPlayer.sendMessage(`村人から§l§d${bowOrSwordItemName}§r§fがドロップしました。`);
                            console.log(`Sent bow or sword drop message to ${targetPlayer.name}`);
                            dimension.runCommand(`playsound random.levelup ${targetPlayer.name}`);
                            console.log("Played random.levelup sound for bow or sword drop");
                        }, 20);
                    } else {
                        targetPlayer.sendMessage(`村人から§l§d${bowOrSwordItemName}§r§fがドロップしました。`);
                        console.log(`Sent bow or sword drop message to ${targetPlayer.name}`);
                        dimension.runCommand(`playsound random.levelup ${targetPlayer.name}`);
                        console.log("Played random.levelup sound for bow or sword drop");
                    }
                }

                // 1%の確率でミシックアーマー（nbt_dropがtrueの場合のみ）
                let mythicArmorDropped = false;
                let mythicArmorItemNames = [];
                if (nbtDropEnabled && Math.random() < 0.01) {
                    const armorCommands = [
                        `structure load saikyou_helmet ${location.x} ${location.y} ${location.z}`,
                        `structure load saikyou_chestplate ${location.x} ${location.y} ${location.z}`,
                        `structure load saikyou_leggings ${location.x} ${location.y} ${location.z}`,
                        `structure load saikyou_boots ${location.x} ${location.y} ${location.z}`
                    ];
                    const numCommands = Math.floor(Math.random() * 4) + 1;
                    for (let i = 0; i < numCommands; i++) {
                        const randomCommand = armorCommands[Math.floor(Math.random() * armorCommands.length)];
                        dimension.runCommand(randomCommand);
                        mythicArmorItemNames.push(getItemName(randomCommand.split(" ")[2]));
                    }
                    mythicArmorDropped = true;
                    console.log("おめでとう！ミシックアーマーがドロップしました！");
                    const armorMessage = mythicArmorItemNames.join("、");
                    if (fireworkGiven) {
                        system.runTimeout(() => {
                            targetPlayer.sendMessage(`村人から§l§g${armorMessage}§r§fがドロップしました。`);
                            console.log(`Sent mythic armor drop message to ${targetPlayer.name}`);
                            dimension.runCommand(`playsound random.levelup ${targetPlayer.name}`);
                            console.log("Played random.levelup sound for mythic armor drop");
                        }, 20);
                    } else {
                        targetPlayer.sendMessage(`村人から§l§g${armorMessage}§r§fがドロップしました。`);
                        console.log(`Sent mythic armor drop message to ${targetPlayer.name}`);
                        dimension.runCommand(`playsound random.levelup ${targetPlayer.name}`);
                        console.log("Played random.levelup sound for mythic armor drop");
                    }
                }

                // 0.5%の確率でミシックボックス（nbt_dropがtrueの場合のみ）
                let mythicBoxDropped = false;
                let mythicBoxItemName = "";
                if (nbtDropEnabled && Math.random() < 0.005) {
                    const boxCommands = [
                        `structure load Inventory_Box ${location.x} ${location.y} ${location.z}`,
                        `structure load Ender_Chest_Box ${location.x} ${location.y} ${location.z}`
                    ];
                    const randomBoxCommand = boxCommands[Math.floor(Math.random() * boxCommands.length)];
                    dimension.runCommand(randomBoxCommand);
                    mythicBoxDropped = true;
                    mythicBoxItemName = getItemName(randomBoxCommand.split(" ")[2]);
                    console.log("おめでとう！ミシックボックスがドロップしました！");
                    if (fireworkGiven) {
                        system.runTimeout(() => {
                            targetPlayer.sendMessage(`村人から§l§g${mythicBoxItemName}§r§fがドロップしました。`);
                            console.log(`Sent mythic box drop message to ${targetPlayer.name}`);
                            dimension.runCommand(`playsound random.levelup ${targetPlayer.name}`);
                            console.log("Played random.levelup sound for mythic box drop");
                        }, 20);
                    } else {
                        targetPlayer.sendMessage(`村人から§l§g${mythicBoxItemName}§r§fがドロップしました。`);
                        console.log(`Sent mythic box drop message to ${targetPlayer.name}`);
                        dimension.runCommand(`playsound random.levelup ${targetPlayer.name}`);
                        console.log("Played random.levelup sound for mythic box drop");
                    }
                }

                // 確率アイテム（ロケット花火を含む）がドロップしなかった場合の処理
                if (!fireworkGiven && !commonItemDropped && !rareItemDropped && !epicItemDropped && !bowOrSwordDropped && !mythicArmorDropped && !mythicBoxDropped) {
                    console.log("確率アイテムドロップなし（ロケット花火含む）");
                    dimension.runCommand(`playsound note.bass ${targetPlayer.name}`);
                    console.log("Played note.bass sound for no probability drop");
                    targetPlayer.sendMessage("§l§e確率ドロップがありませんでした§r§f");
                    console.log(`Sent no probability drop message to ${targetPlayer.name}`);
                }

                // コマンド実行後にゲームルールを戻す
                dimension.runCommand("gamerule sendcommandfeedback true");
                console.log("Command feedback re-enabled");
            } catch (error) {
                console.error("Error executing loot command:", error);
                try {
                    dimension.runCommand("gamerule sendcommandfeedback true");
                    console.log("Command feedback re-enabled after error");
                } catch (err) {
                    console.error("Error re-enabling command feedback:", err);
                }
            };
    }
});
