import { world, system } from "@minecraft/server";

// エンティティがダメージを受けて死亡したときのイベントリスナー
world.afterEvents.entityDie.subscribe((eventData) => {
    // 死亡したエンティティが村人かどうかを確認
    if (eventData.deadEntity.typeId === "minecraft:villager_v2") {
        // 村人を倒したエンティティ（プレイヤーまたは狼）を取得
        const killer = eventData.damageSource.damagingEntity;
        
        // キラーがプレイヤーまたは狼であることを確認
        if (killer && (killer.typeId === "minecraft:player" || killer.typeId === "minecraft:wolf")) {
            // 村人の位置を取得
            const location = eventData.deadEntity.location;
            
            // lootコマンドを実行
            const command = `loot spawn ${location.x} ${location.y} ${location.z} loot "entities/villager"`;
            
            try {
                // コマンドを実行
                world.getDimension("overworld").runCommand(command);
                
                // オプション：ログを残す
                console.log(`Loot dropped for villager at ${location.x}, ${location.y}, ${location.z}`);
                
                // 35%の確率で「arrow」「spyglass」「hanabi」「elytra」「fishing_hook1」「fishing_hook2」コマンドを実行（コモン）
                let commonItemDropped = false;
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
                    world.getDimension("overworld").runCommand(randomCommonCommand);
                    commonItemDropped = true;
                    console.log("おめでとう！コモンアイテムがドロップしました！");
                    if (killer.typeId === "minecraft:player") {
                        world.getDimension("overworld").runCommand(`tellraw ${killer.name} {"rawtext":[{"text":"おめでとう！村人からコモンアイテムがドロップしました。素早く回収しましょう！"}]}`);
                        world.getDimension("overworld").runCommand(`playsound ui.toast.challenge_complete ${killer.name}`);
                    }
                }

                // 15%の確率で「shield」「trident1」「trident2」コマンドを実行（レア）
                let rareItemDropped = false;
                if (Math.random() < 0.15) {
                    const rareCommands = [
                        `structure load shield ${location.x} ${location.y} ${location.z}`,
                        `structure load trident1 ${location.x} ${location.y} ${location.z}`,
                        `structure load trident2 ${location.x} ${location.y} ${location.z}`
                    ];
                    const randomRareCommand = rareCommands[Math.floor(Math.random() * rareCommands.length)];
                    world.getDimension("overworld").runCommand(randomRareCommand);
                    rareItemDropped = true;
                    console.log("おめでとう！レアアイテムがドロップしました！");
                    if (killer.typeId === "minecraft:player") {
                        world.getDimension("overworld").runCommand(`tellraw ${killer.name} {"rawtext":[{"text":"おめでとう！村人からレアアイテムがドロップしました。素早く回収しましょう！"}]}`);
                        world.getDimension("overworld").runCommand(`playsound ui.toast.challenge_complete ${killer.name}`);
                    }
                }

                // 10%の確率で「powder_snow_boots」「piglin_helmet」「frost_walker_boots」「piglin_chestplate」コマンドを実行（エピック）
                let epicItemDropped = false;
                if (Math.random() < 0.1) {
                    const epicCommands = [
                        `structure load powder_snow_boots ${location.x} ${location.y} ${location.z}`,
                        `structure load piglin_helmet ${location.x} ${location.y} ${location.z}`,
                        `structure load frost_walker_boots ${location.x} ${location.y} ${location.z}`,
                        `structure load piglin_chestplate ${location.x} ${location.y} ${location.z}`
                    ];
                    const randomEpicCommand = epicCommands[Math.floor(Math.random() * epicCommands.length)];
                    world.getDimension("overworld").runCommand(randomEpicCommand);
                    epicItemDropped = true;
                    console.log("おめでとう！エピックアイテムがドロップしました！");
                    if (killer.typeId === "minecraft:player") {
                        world.getDimension("overworld").runCommand(`tellraw ${killer.name} {"rawtext":[{"text":"おめでとう！村人からエピックアイテムがドロップしました。素早く回収しましょう！"}]}`);
                        world.getDimension("overworld").runCommand(`playsound ui.toast.challenge_complete ${killer.name}`);
                    }
                }

// 5%の確率で「saikyou_bow」または「saikyou_sword」コマンドを1回実行（レジェンド）
let bowOrSwordDropped = false;
if (Math.random() < 0.05) {
    const bowOrSwordCommands = [
        `structure load saikyou_bow ${location.x} ${location.y} ${location.z}`,
        `structure load saikyou_sword ${location.x} ${location.y} ${location.z}`
    ];
    const randomBowOrSwordCommand = bowOrSwordCommands[Math.floor(Math.random() * bowOrSwordCommands.length)];
    world.getDimension("overworld").runCommand(randomBowOrSwordCommand);
    bowOrSwordDropped = true;
    console.log("おめでとう！Ancient Super BowまたはInfinity Bladeがドロップしました！");
    if (killer.typeId === "minecraft:player") {
        world.getDimension("overworld").runCommand(`tellraw ${killer.name} {"rawtext":[{"text":"おめでとう！Ancient Super BowまたはInfinity Bladeがドロップしました。素早く回収しましょう！"}]}`);
        world.getDimension("overworld").runCommand(`playsound ui.toast.challenge_complete ${killer.name}`);
    }
}

// 1%の確率で最大4回「saikyou_armor」コマンドを実行（ミシックアーマー）
let mythicArmorDropped = false;
if (Math.random() < 0.01) {
    const armorCommands = [
        `structure load saikyou_helmet ${location.x} ${location.y} ${location.z}`,
        `structure load saikyou_chestplate ${location.x} ${location.y} ${location.z}`,
        `structure load saikyou_leggings ${location.x} ${location.y} ${location.z}`,
        `structure load saikyou_boots ${location.x} ${location.y} ${location.z}`
    ];
    const numCommands = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numCommands; i++) {
        const randomCommand = armorCommands[Math.floor(Math.random() * armorCommands.length)];
        world.getDimension("overworld").runCommand(randomCommand);
    }
    mythicArmorDropped = true;
    console.log("おめでとう！ミシックアーマーがドロップしました！");
    if (killer.typeId === "minecraft:player") {
        world.getDimension("overworld").runCommand(`tellraw ${killer.name} {"rawtext":[{"text":"おめでとう！村人からミシックアーマーがドロップしました。素早く回収しましょう！"}]}`);
        world.getDimension("overworld").runCommand(`playsound ui.toast.challenge_complete ${killer.name}`);
    }
}

// 0.5%の確率で「inventory_box」または「ender_chest_box」コマンドを実行（ミシックボックス）
let mythicBoxDropped = false;
if (Math.random() < 0.005) {
    const boxCommands = [
        `structure load inventory_box ${location.x} ${location.y} ${location.z}`,
        `structure load ender_chest_box ${location.x} ${location.y} ${location.z}`
    ];
    const randomBoxCommand = boxCommands[Math.floor(Math.random() * boxCommands.length)];
    world.getDimension("overworld").runCommand(randomBoxCommand);
    mythicBoxDropped = true;
    console.log("おめでとう！ミシックボックスがドロップしました！");
    if (killer.typeId === "minecraft:player") {
        world.getDimension("overworld").runCommand(`tellraw ${killer.name} {"rawtext":[{"text":"おめでとう！村人からミシックボックスがドロップしました。素早く回収しましょう！"}]}`);
        world.getDimension("overworld").runCommand(`playsound ui.toast.challenge_complete ${killer.name}`);
    }
}

// 確率アイテムがドロップしなかった場合のログ出力
if (!commonItemDropped && !rareItemDropped && !epicItemDropped && !bowOrSwordDropped && !mythicArmorDropped && !mythicBoxDropped) {
    console.log("確率アイテムドロップなし");
                }
            } catch (error) {
                // エラーハンドリング
                console.error("Error executing loot command:", error);
            }
        }
    }
});