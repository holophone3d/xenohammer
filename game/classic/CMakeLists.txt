cmake_minimum_required(VERSION 3.20)
project(xenohammer-classic LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- Dependencies via find_package (vcpkg provides these) -------------------
find_package(SDL2       CONFIG REQUIRED)
find_package(SDL2_image CONFIG REQUIRED)
find_package(SDL2_mixer CONFIG REQUIRED)
find_package(SDL2_ttf   CONFIG REQUIRED)
find_package(OpenGL     REQUIRED)

# --- Collect source files ----------------------------------------------------
file(GLOB GAME_SOURCES
    src/game/*.cpp
    src/game/*.h
)
file(GLOB SHIM_SOURCES
    src/clanlib_shim/impl/*.cpp
    src/clanlib_shim/impl/*.h
)

# --- Executable target -------------------------------------------------------
add_executable(xenohammer-classic
    ${GAME_SOURCES}
    ${SHIM_SOURCES}
)

# --- Include directories ------------------------------------------------------
# src/clanlib_shim/ so that #include <ClanLib/core.h> resolves
# src/game/         so game headers can find each other
target_include_directories(xenohammer-classic PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src/clanlib_shim
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
)

# --- Debugging working directory = assets folder -----------------------------
set_target_properties(xenohammer-classic PROPERTIES
    VS_DEBUGGER_WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/../assets"
)
