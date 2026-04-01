cmake_minimum_required(VERSION 3.20)
project(xenohammer-classic LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- Dependencies via find_package (vcpkg provides these) -------------------
find_package(SDL2       CONFIG REQUIRED)
find_package(SDL2_image CONFIG REQUIRED)
find_package(SDL2_mixer CONFIG REQUIRED)
find_package(SDL2_ttf   CONFIG REQUIRED)
find_package(OpenGL     REQUIRED)
find_package(miniz      CONFIG REQUIRED)

# --- Collect source files ----------------------------------------------------
file(GLOB GAME_SOURCES
    src/game/*.cpp
    src/game/*.h
)

# CapitalShip.cpp is dead code — duplicate definitions of inline methods
# already defined in CapitalShip.h, and references undeclared members.
# The original VS6 project did not compile this file.
list(FILTER GAME_SOURCES EXCLUDE REGEX ".*CapitalShip\\.cpp$")

# GameManager.cpp and Homing.cpp are compiled via compat proxy files instead.
# GameManager_proxy.cpp adds VC6 for-scope compatibility (leaked iterators).
# Homing_proxy.cpp fixes include ordering (PlayerShip must precede EnemyShip).
list(FILTER GAME_SOURCES EXCLUDE REGEX ".*GameManager\\.cpp$")
list(FILTER GAME_SOURCES EXCLUDE REGEX ".*Homing\\.cpp$")

file(GLOB COMPAT_PROXIES src/compat/game/*.cpp)

file(GLOB SHIM_SOURCES
    src/compat/clanlib_shim/*.cpp
    src/compat/clanlib_shim/*.h
)

# --- Embedded asset ZIP (single-file EXE) ------------------------------------
set(ASSETS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/assets")
set(ASSETS_ZIP "${CMAKE_CURRENT_BINARY_DIR}/assets.zip")
set(ASSETS_RC  "${CMAKE_CURRENT_BINARY_DIR}/assets.rc")

# Pack all assets into a ZIP archive at build time
add_custom_command(
    OUTPUT ${ASSETS_ZIP}
    COMMAND ${CMAKE_COMMAND} -E tar cf ${ASSETS_ZIP} --format=zip -- .
    WORKING_DIRECTORY ${ASSETS_DIR}
    COMMENT "Packing game assets into ZIP archive"
)

# Generate Windows resource file that embeds the ZIP
file(WRITE ${ASSETS_RC} "#include <winres.h>\nASSETS_ZIP RCDATA \"assets.zip\"\n")

# Ensure ZIP is built before the RC is compiled
add_custom_target(pack_assets DEPENDS ${ASSETS_ZIP})

# --- Executable target -------------------------------------------------------
add_executable(xenohammer-classic
    ${GAME_SOURCES}
    ${SHIM_SOURCES}
    ${COMPAT_PROXIES}
    ${ASSETS_RC}
)

# Ensure ZIP is packed before RC compilation
add_dependencies(xenohammer-classic pack_assets)

# --- Include directories ------------------------------------------------------
# compat/ and compat/io/ FIRST so they intercept <malloc.h>, <fstream.h>, <gl\glaux.h>, etc.
# compat/clanlib_shim/ so that #include <ClanLib/core.h> resolves
# game/ so game headers can find each other
target_include_directories(xenohammer-classic PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src/compat/io
    ${CMAKE_CURRENT_SOURCE_DIR}/src/compat
    ${CMAKE_CURRENT_SOURCE_DIR}/src/compat/clanlib_shim
    ${CMAKE_CURRENT_SOURCE_DIR}/src/game
)

# --- Link libraries -----------------------------------------------------------
target_link_libraries(xenohammer-classic PRIVATE
    $<TARGET_NAME_IF_EXISTS:SDL2::SDL2main>
    $<IF:$<TARGET_EXISTS:SDL2::SDL2>,SDL2::SDL2,SDL2::SDL2-static>
    $<IF:$<TARGET_EXISTS:SDL2_image::SDL2_image>,SDL2_image::SDL2_image,SDL2_image::SDL2_image-static>
    $<IF:$<TARGET_EXISTS:SDL2_mixer::SDL2_mixer>,SDL2_mixer::SDL2_mixer,SDL2_mixer::SDL2_mixer-static>
    $<IF:$<TARGET_EXISTS:SDL2_ttf::SDL2_ttf>,SDL2_ttf::SDL2_ttf,SDL2_ttf::SDL2_ttf-static>
    OpenGL::GL
    OpenGL::GLU
    miniz::miniz
)

# Suppress warnings in game source (year-2000 C++ is noisy)
if(MSVC)
    target_compile_options(xenohammer-classic PRIVATE /W2 /wd4996 /wd4267 /wd4244 /wd4305 /wd4834)
else()
    target_compile_options(xenohammer-classic PRIVATE -w)
endif()

# --- Post-build: copy assets next to the executable -------------------------
# Assets are also embedded in the EXE via ZIP resource, but loose files are
# still copied for development (savedplayer.txt, debugging, etc.)
add_custom_command(TARGET xenohammer-classic POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_CURRENT_SOURCE_DIR}/assets"
        "$<TARGET_FILE_DIR:xenohammer-classic>"
    COMMENT "Copying game assets to output directory"
)
