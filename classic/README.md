# XenoHammer Classic

Original C++ source rebuilt with CMake and modern SDL2 via vcpkg.

## Prerequisites

- CMake ≥ 3.20
- A C++17 compiler (MSVC 2019+, GCC 10+, Clang 12+)
- [vcpkg](https://github.com/microsoft/vcpkg) installed and bootstrapped

## Build

```powershell
# From the classic\ directory:
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="<vcpkg-root>\scripts\buildsystems\vcpkg.cmake"
cmake --build build --config Release
```

vcpkg will automatically fetch and build SDL2, SDL2_image, SDL2_mixer (with Vorbis), and SDL2_ttf.

## Run

The debugger working directory is set to `../assets` so game data is found automatically.

```powershell
.\build\Release\xenohammer-classic.exe
```
