$base = 'c:\Users\wwwar\Downloads\New folder\bana-to-lete-hai-pehle\frontend\evaluator-ui\stitch-design'
New-Item -ItemType Directory -Force -Path "$base\code" | Out-Null
New-Item -ItemType Directory -Force -Path "$base\images" | Out-Null

$items = @(
    @{
        name = "screen_1_authentication"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1WhJZa4OY1krA0Gbp6hrb0JkUarv4jqIao0z2ewZP_F2bevy9jrSXblenZHB8LZ-e4bzwpvXecIdSA2qQvyCpwdW3sKYsuHhFnYytS1O8GctjFWe8WhR3Gk7ZUAVQGSoktLYd_X7inJlhiUVv6BKHRM09HIO69IS_cI64w9aBMo_GLkbl6h0dUiXBHYdGyfV_kLukFINz3iX2oIGtraaL4oYBftm5Zuht4ywv0rY-hrwAgmN30uPyFtq1M"
        code = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWZiZTVkNmQzYTgwNzc5YTBiMGVlMTg5YWFkEgsSBxC90_eKjBQYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ5ODgxOTk3NTM4Njc3NTQ3Nw&filename=&opi=89354086"
    },
    @{
        name = "screen_2_evaluator_profile_panel"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1UV7u2LFCIZx6RkRAtf4ghhpSmNwYFg9dSl4WC6CuLgTgoG-eorgEwhttLNz4nZSicz2v1qw9KToMCrS_eKED9gU99Jc8hYY0N_i_qaXqRTkQnGaKmPOzXJIs6ZySzk0qWCaoQBo5uJhXkP8jSHAEi8ZzyB9PjVJ6aJp0JVronvzyyy6crrnuaz3mEdYqTgk6Y33JgTfSzstdssvDngiN0hU42Am_LJvu_dH1edDpURZ7MuhHDKJAhlEPA"
        code = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWZiZTY0MDFhNWMwMzM4NWExY2E5Mjg3ZWJlEgsSBxC90_eKjBQYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ5ODgxOTk3NTM4Njc3NTQ3Nw&filename=&opi=89354086"
    },
    @{
        name = "screen_3_evaluator_criteria_panel"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1UQADzDJY_CHkgAFvAqmPmc51Ty--GGH09pb7R-WL1lfE7SvJFQgGFrzE0_0duJ8q-My4kBZCsnrpA1LfPBWDefUEsSLUsshmgSIYIwoZoy6e8wxmlaONAlwnlBwgoNIbCJprqxhvkcLabZ9jajQ0AOTFC0Gzwwfs5r0jm9oK4wyp0MhNa-ldcu33VBmrE6uFuwOk44-2toLLZcf_0QGOfofo_eWsbNqrP4J4PfCjncrr7LQk3gy0FrmYKM"
        code = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWZiZTc1YmNiNTQwMmE5YjIwZDk3MDdlMDk1EgsSBxC90_eKjBQYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ5ODgxOTk3NTM4Njc3NTQ3Nw&filename=&opi=89354086"
    },
    @{
        name = "screen_4_evaluator_work_queue"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1V4zl60rfxcCfp3d9hOPMwKLkTgtLfHfqbx7DwNm2S3GuZcQNNLZ3dIW4cBOFMUrVOsioqF1N9a16dTTbStYlBSosFYibsHsExKEpaO9-dOoLUdY7KrDUt6W2TUcT-f7P7NcAdK4tmvgaubgGlcy3H4u2k52a_bYxj9RHvzMGmE97sJwN3hU_c_OQClMSFQzF7-e-YsyhPMyO7agsa2G0Q8a-XoBfjBT-jCkMDVZTL_P4-pkccyd_03ZF0R"
        code = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWZiZTY3MjI2ZDQwMmQzZmQwNThmMTY5ZTFkEgsSBxC90_eKjBQYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ5ODgxOTk3NTM4Njc3NTQ3Nw&filename=&opi=89354086"
    },
    @{
        name = "screen_5_assignment_scoring_screen"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1UZl4pS87NSrcLhWAlhkLEWC90m29qY7CEnI4-zNzA6owENwgbOTiY0J270ezRKQQXFcUXSFGWD_myI3fGqXlyA7Xta02Blu0EkPNEXWnYIarPx2NT_YaFpc_E1RCv9XzmOlGoT_txM_OF9tyA77WD8RMnw0dAr3t2cEbKc4hpRZ49J52XhFv8-BA5NI5y5hjxerilf0JXttStx8BEkdvWuMteOHPulfC12hGdNVgMz4B18hsBOtm8sNUaF"
        code = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWZiZTcyODc2ZDkwNDg2MDFjODJkMWUyYmFkEgsSBxC90_eKjBQYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ5ODgxOTk3NTM4Njc3NTQ3Nw&filename=&opi=89354086"
    }
)

foreach ($item in $items) {
    Write-Host "Downloading $($item.name)..."
    curl.exe -L -o "$base\images\$($item.name).png" $item.img
    curl.exe -L -o "$base\code\$($item.name).html" $item.code
}

Write-Host "Done downloading all 5 screens!"
