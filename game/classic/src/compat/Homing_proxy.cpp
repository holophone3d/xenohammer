// Homing_proxy.cpp — Wraps Homing.cpp with correct include ordering.
//
// EnemyShip.h has inline code that accesses manager->Fighter->get_x()
// which requires PlayerShip to be fully defined, not just forward-declared.
// Homing.cpp includes EnemyShip.h before PlayerShip.h, causing C2027.
//
// This proxy ensures PlayerShip.h is fully included before Homing.cpp.

#include "PlayerShip.h"

// Pull in the actual game source
#include "Homing.cpp"
