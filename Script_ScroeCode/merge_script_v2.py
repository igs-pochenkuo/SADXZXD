import sys
import json
import re
import argparse

def parse_lua_settings(block_content):
    """
    解析 Lua table 區塊內的鍵值對，並將其轉換為 Python 字典。
    """
    settings = {}
    pattern = re.compile(r"([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)(?:,|$|\n)")
    
    inner_content_match = re.search(r"{\s*(.*)\s*}", block_content, re.DOTALL)
    if not inner_content_match:
        return {}
    
    inner_content = inner_content_match.group(1)

    for match in pattern.finditer(inner_content):
        key = match.group(1).strip()
        value_str = match.group(2).strip()

        if value_str.startswith('"') and value_str.endswith('"'):
            settings[key] = value_str[1:-1].replace('\"', '"')
        elif value_str == 'true':
            settings[key] = True
        elif value_str == 'false':
            settings[key] = False
        else:
            try:
                settings[key] = int(value_str)
            except ValueError:
                try:
                    settings[key] = float(value_str)
                except ValueError:
                    settings[key] = value_str
    return settings

def format_settings_to_lua(settings, base_indent_str):
    """
    將 Python 字典格式化為 Lua table 字串，並動態應用傳入的基礎縮排。
    """
    lines = ['{']
    inner_indent_str = base_indent_str
    sorted_keys = sorted(settings.keys())

    for key in sorted_keys:
        value = settings[key]
        formatted_key = key

        if isinstance(value, str):
            escaped_str = value.replace('\\', '\\\\').replace('"', '\"')
            formatted_value = f'"{escaped_str}"'
        elif isinstance(value, bool):
            formatted_value = str(value).lower()
        elif isinstance(value, (int, float)):
            formatted_value = str(value)
        else:
            formatted_value = f'"{str(value)}"'

        lines.append(f'{inner_indent_str}{formatted_key} = {formatted_value},')

    lines.append(f'        }}')
    return '\n'.join(lines)

def find_full_block(content, pattern):
    """
    健壯的區塊尋找函式，透過計數器精準尋找與模式匹配的完整 Lua table。
    """
    match = re.search(pattern, content)
    if not match:
        return None, -1, -1

    search_start = match.end()
    block_start_index = content.find('{', search_start)
    if block_start_index == -1:
        return None, -1, -1

    open_braces = 1
    for i in range(block_start_index + 1, len(content)):
        char = content[i]
        if char == '{':
            open_braces += 1
        elif char == '}':
            open_braces -= 1
            if open_braces == 0:
                block_end_index = i
                full_block = content[match.start():block_end_index + 1]
                return full_block, match.start(), block_end_index + 1
    
    return None, -1, -1

def main():
    parser = argparse.ArgumentParser(
        description='高精度文字更新工具，用於更新 Lua 檔案中的 DYNAMIC_BANNER_DEFINE。'
    )
    parser.add_argument('--target', type=str, required=True, help='目標 LobbyDefine.lua 檔案的絕對路徑。')
    parser.add_argument('--input', type=str, required=True, help='來源 update.json 檔案的絕對路徑。')

    args = parser.parse_args()

    try:
        with open(args.target, 'r', encoding='utf-8') as f:
            lua_content = f.read()

        original_lua_content = lua_content

        with open(args.input, 'r', encoding='utf-8') as f:
            update_data = json.load(f)

        platform = update_data.get('platform')
        game_id = update_data.get('game_id')
        settings = update_data.get('settings')

        if not all([platform, game_id, settings is not None]):
            raise ValueError("輸入的 JSON 必須包含 'platform', 'game_id', 和 'settings' 鍵。")

        platform_key = f"inn.PLATFORM.{platform}"
        game_id_key = f"inn.SceneIds.{game_id}"

        # --- 核心邏輯：階層式搜尋與更新 ---

        # 1. 鎖定 DYNAMIC_BANNER_DEFINE 總表
        define_block_pattern = r"(LobbyDefine\.)?DYNAMIC_BANNER_DEFINE\s*=\s*"
        define_full_block, define_start_idx, define_end_idx = find_full_block(lua_content, define_block_pattern)

        if define_full_block is None:
            raise ValueError("在目標檔案中找不到 'DYNAMIC_BANNER_DEFINE' 表格。")

        define_content_start = define_full_block.find('{')
        define_content = define_full_block[define_content_start:]

        # 2. 在總表內，鎖定平台區塊
        platform_block_pattern = r"\[" + re.escape(platform_key) + r"\]\s*=\s*"
        platform_full_block, _, _ = find_full_block(define_content, platform_block_pattern)

        updated_define_content = ""

        if platform_full_block:
            # --- 情境 A: 平台已存在 ---
            
            # 3. 在平台區塊內，鎖定遊戲區塊
            game_block_pattern = r"\[" + re.escape(game_id_key) + r"\]\s*=\s*"
            existing_game_block, game_start_in_platform, _ = find_full_block(platform_full_block, game_block_pattern)

            if existing_game_block:
                # 情境 A.1: 遊戲已存在 -> 智慧合併更新
                current_settings = parse_lua_settings(existing_game_block)
                new_settings = update_data.get('settings', {})
                current_settings.update(new_settings)
                merged_settings = current_settings

                line_start_index = platform_full_block.rfind('\n', 0, game_start_in_platform) + 1
                indentation = platform_full_block[line_start_index:game_start_in_platform]
                
                new_settings_str = format_settings_to_lua(merged_settings, indentation + '    ')
                new_game_block_str = f"[{game_id_key}] = {new_settings_str}"

                updated_platform_block = platform_full_block.replace(existing_game_block, new_game_block_str, 1)
                updated_define_content = define_content.replace(platform_full_block, updated_platform_block, 1)

            else:
                # 情境 A.2: 遊戲不存在 -> 在平台內新增遊戲
                indentation = ' ' * 8
                new_settings_str = format_settings_to_lua(settings, indentation + '    ')
                new_game_block_str = f"[{game_id_key}] = {new_settings_str}"
                
                insertion_point = platform_full_block.rfind('}')
                content_before_brace = platform_full_block[:insertion_point].rstrip()
                if not content_before_brace.endswith(',') and content_before_brace != '{':
                    content_before_brace += ','
                
                insertion_str = f"\n{indentation}{new_game_block_str}"
                updated_platform_block = content_before_brace + insertion_str + "\n    " + platform_full_block[insertion_point:]
                updated_define_content = define_content.replace(platform_full_block, updated_platform_block, 1)
        else:
            # --- 情境 B: 平台不存在 -> 新增整個平台區塊 ---
            platform_indentation = ' ' * 4
            game_indentation = platform_indentation + ' ' * 4

            new_settings_str = format_settings_to_lua(settings, game_indentation + '    ')
            new_game_block_str = f"{game_indentation}[{game_id_key}] = {new_settings_str}"

            new_platform_block_str = (
                f"{platform_indentation}[{platform_key}] = {{\n"
                f"{new_game_block_str}\n"
                f"{platform_indentation}}}"
            )

            insertion_point = define_content.rfind('}')
            content_before_brace = define_content[:insertion_point].rstrip()
            if not content_before_brace.endswith(',') and content_before_brace != '{':
                content_before_brace += ','

            insertion_str = f"\n{new_platform_block_str}"
            updated_define_content = content_before_brace + insertion_str + "\n" + define_content[insertion_point:]

        # 最後，用更新後的內容重建總表，並替換回原始檔案內容
        assignment_part = define_full_block[:define_content_start]
        new_define_full_block = assignment_part + updated_define_content

        final_lua_content = original_lua_content[:define_start_idx] + new_define_full_block + original_lua_content[define_end_idx:]

        with open(args.target, 'w', encoding='utf-8') as f:
            f.write(final_lua_content)

        print(f"已成功使用 '{args.input}' 的內容更新 '{args.target}'。")
        sys.exit(0)

    except FileNotFoundError as e:
        print(f"錯誤：找不到檔案 - {e}", file=sys.stderr)
        sys.exit(1)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"錯誤：無效的資料或檔案格式 - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"發生未預期的錯誤：{e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()