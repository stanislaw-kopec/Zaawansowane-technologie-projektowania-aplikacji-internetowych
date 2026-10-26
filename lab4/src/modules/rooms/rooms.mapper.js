function toRoomResponse(room) {
    return { id: room.id, name: room.name, capacity: room.capacity,
        ...(room.building ? { building: { id: room.building.id, name: room.building.name } } : {}) };
}

module.exports = { toRoomResponse };
