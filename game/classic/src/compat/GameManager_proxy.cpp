// GameManager_proxy.cpp — Wraps GameManager.cpp with for-scope compatibility.
//
// VC6 leaked variables declared in for-loop initializers into the enclosing
// scope. Modern C++ (C++98+) properly scopes them. The original game code
// relies on the leaked iterators in several later for-loops.
//
// Since we CANNOT modify game source, we declare the iterator variables at
// namespace scope. For-loops that re-declare them create local shadows;
// for-loops that just assign to them use these namespace-scope variables.

#include "GameManager.h"
#include "PlayerShip.h"
#include "EnemyShip.h"
#include "CapitalShip.h"

// VC6 for-scope leaked iterators used by collision_update() and cleanupWorld()
static std::list<EnemyShip *>::iterator itEnemyShips;
static std::list<CapitalShip *>::iterator itCapShips;

// Pull in the actual game source — its own #includes are guarded (no-ops)
#include "GameManager.cpp"
