var helpers = {};

// Returns false if the given coordinates are out of range
helpers.validCoordinates = function(board, distanceFromTop, distanceFromLeft) {
  return (!(distanceFromTop < 0 || distanceFromLeft < 0 ||
      distanceFromTop > board.lengthOfSide - 1 || distanceFromLeft > board.lengthOfSide - 1));
};

// Returns the tile [direction] (North, South, East, or West) of the given X/Y coordinate
helpers.getTileNearby = function(board, distanceFromTop, distanceFromLeft, direction) {

  // These are the X/Y coordinates
  var fromTopNew = distanceFromTop;
  var fromLeftNew = distanceFromLeft;

  // This associates the cardinal directions with an X or Y coordinate
  if (direction === 'North') {
    fromTopNew -= 1;
  } else if (direction === 'East') {
    fromLeftNew += 1;
  } else if (direction === 'South') {
    fromTopNew += 1;
  } else if (direction === 'West') {
    fromLeftNew -= 1;
  } else {
    return false;
  }

  // If the coordinates of the tile nearby are valid, return the tile object at those coordinates
  if (helpers.validCoordinates(board, fromTopNew, fromLeftNew)) {
    return board.tiles[fromTopNew][fromLeftNew];
  } else {
    return false;
  }
};


helpers.manhattanHeuristic = function(startLocation, targetLocation){
  var dx = targetLocation.x - startLocation.x;
  var dy = targetLocation.y - startLocation.y;
  return Math.abs(dx) + Math.abs(dy);
};

helpers.basicEnemyAvoid = function (gameData, x, y){
  var hero = gameData.activeHero;
  var board = gameData.board;
  var cost = 1;
  for (var i = y-2; i <= y+2; i ++){
    for (var j = x-2; j <= x + 2; j ++)
    var validTile = helpers.validCoordinates(board, i, j)
    if (validTile){
      var tile = board.tiles[i][j];
      if (typeof tile != "undefined" && tile.type === 'Hero' && tile.team !== hero.team){
        cost += 5;
      }
    }
  }
  return cost;
};


helpers.findWeightedPathDirectionAndDistance = function(gameData, fromTile, target, tileEvaluator, heuristicCallback){
  var board = gameData.board
  var openList = [];
  var closedList = [];
  var costs = {};
  var parents = {};

  function nodeToKey(node){
      return node.x + "|" + node.y;
  }

  function inNodeList(nodeList, node){
    for (var i = 0; i < nodeList.length; i ++){
      if (nodeList[i].x === node.x && nodeList[i].y === node.y){
        return i;
      }
    }
    return false;
  }

  function insertIntoOpenList(newNode, heuristicValue){
    var newKey = nodeToKey(newNode);

    for (var i = 0; i < openList.length; i ++){
      var currentKey = nodeToKey(openList[i]);
      if (costs[currentKey] > costs[newKey] ){
        openList.splice(i, 0, newNode);
        return;
      }
    }

    openList.push(newNode);
  }

  function buildPath(currentNode, startNode){
    //console.log(JSON.stringify(currentNode));
    //console.log(JSON.stringify(startNode));
    if (currentNode.x == startNode.x && currentNode.y == startNode.y){
      return [];
    }
    else{
      var parent = parents[nodeToKey(currentNode)];
      var currentPath = buildPath(parent, startNode);
      currentPath.push({node: currentNode, direction: directionFromNode(parent, currentNode)})
      return currentPath;
    }
  }

  function directionFromNode(startNode, neighbourNode){
    var dX = neighbourNode.x - startNode.x;
    var dY = neighbourNode.y - startNode.y;
    if (dX > 0){
      return "East";
    }
    else if (dX < 0){
      return "West";
    }
    else if (dY > 0){
      return "South";
    }
    else if (dY < 0){
      return "North";
    }

    return "Stay";
  }


  var currentKey = nodeToKey(fromTile);
  openList.push(fromTile);
  costs[currentKey] = 0;
  parents[currentKey] = fromTile;

  while(openList.length !==0 && (openList[0].x !== target.x || openList[0].y !== target.y)){

    var currentNode = openList.splice(0,1)[0];
    closedList.push(currentNode);
    currentKey = nodeToKey(currentNode);

    /*console.log("OpenList: " + JSON.stringify(openList));
    console.log("ClosedList: " + JSON.stringify(closedList));
    console.log("Current: " + JSON.stringify(currentNode));
    console.log("Target: " + JSON.stringify(target));
    */
    var neighbours = helpers.getNeighbouringTiles(board, currentNode, target);
    /*
    console.log("Neighbours: " + JSON.stringify(neighbours));
    console.log("-----------------------------------------------");*/

    for (var i = 0; i < neighbours.length; i ++){
      var neighbourKey = nodeToKey(neighbours[i]);
      var cost = costs[currentKey] + tileEvaluator(gameData, neighbours[i].x, neighbours[i].y);

      var isInOpenList = inNodeList(openList, neighbours[i]);
      if (isInOpenList !== false && costs[neighbourKey] > cost){
        openList.splice(isInOpenList,1);
        isInOpenList = false;
      }

      var isInClosedList = inNodeList(closedList, neighbours[i]);
      if (isInClosedList !== false && costs[neighbourKey] > cost){
        closedList.splice(isInClosedList,1);
        isInClosedList = false;
      }

      if (isInClosedList === false && isInOpenList === false){
        costs[neighbourKey] = cost;
        insertIntoOpenList(neighbours[i], heuristicCallback(neighbours[i], target));
        parents[neighbourKey] = currentNode; 
      }
    }

  }

  if (openList.length !== 0){
    var path = buildPath(openList[0], fromTile);
    //console.log(JSON.stringify(path));
    //console.log(JSON.stringify(target));
    console.log(JSON.stringify(path));
    return path[0].direction;
  }


  // If we are blocked and there is no way to get where we want to go, return false
  return false;

};

helpers.getNeighbouringTiles = function (board, location, target){
  var neighbours = [];
  var directions = ['North', 'East', 'South', 'West'];
  for (var i = 0; i < directions.length; i++) {
    // For each of the cardinal directions get the next tile...
    var direction = directions[i];

    // ...Use the getTileNearby helper method to do this
    var nextTile = helpers.getTileNearby(board, location.y, location.x, direction);

    // If nextTile is a valid location to move...
    if (nextTile && (nextTile.type === 'Unoccupied' || nextTile.type === 'Bones' || (nextTile.distanceFromLeft == target.x && nextTile.distanceFromTop == target.y))) {
      neighbours.push({x: nextTile.distanceFromLeft, y: nextTile.distanceFromTop});
    }
  }
  return neighbours;
}


// Returns an object with certain properties of the nearest object we are looking for
helpers.findNearestObjectDirectionAndDistance = function(board, fromTile, tileCallback) {
  // Storage queue to keep track of places the fromTile has been
  var queue = [];

  //Keeps track of places the fromTile has been for constant time lookup later
  var visited = {};

  // Variable assignments for fromTile's coordinates
  var dft = fromTile.distanceFromTop;
  var dfl = fromTile.distanceFromLeft;

  // Stores the coordinates, the direction fromTile is coming from, and it's location
  var visitInfo = [dft, dfl, 'None', 'START'];

  //Just a unique way of storing each location we've visited
  visited[dft + '|' + dfl] = true;

  // Push the starting tile on to the queue
  queue.push(visitInfo);

  // While the queue has a length
  while (queue.length > 0) {

    // Shift off first item in queue
    var coords = queue.shift();

    // Reset the coordinates to the shifted object's coordinates
    dft = coords[0];
    dfl = coords[1];

    // Loop through cardinal directions
    var directions = ['North', 'East', 'South', 'West'];
    for (var i = 0; i < directions.length; i++) {

      // For each of the cardinal directions get the next tile...
      var direction = directions[i];

      // ...Use the getTileNearby helper method to do this
      var nextTile = helpers.getTileNearby(board, dft, dfl, direction);

      // If nextTile is a valid location to move...
      if (nextTile) {

        // Assign a key variable the nextTile's coordinates to put into our visited object later
        var key = nextTile.distanceFromTop + '|' + nextTile.distanceFromLeft;

        var isGoalTile = false;
        try {
          isGoalTile = tileCallback(nextTile);
        } catch(err) {
          isGoalTile = false;
        }

        // If we have visited this tile before
        if (visited.hasOwnProperty(key)) {

          //Do nothing--this tile has already been visited

        //Is this tile the one we want?
        } else if (isGoalTile) {
          // This variable will eventually hold the first direction we went on this path
          var correctDirection = direction;

          // This is the distance away from the final destination that will be incremented in a bit
          var distance = 1;

          // These are the coordinates of our target tileType
          var finalCoords = [nextTile.distanceFromTop, nextTile.distanceFromLeft];

          // Loop back through path until we get to the start
          while (coords[3] !== 'START') {

            // Haven't found the start yet, so go to previous location
            correctDirection = coords[2];

            // We also need to increment the distance
            distance++;

            // And update the coords of our current path
            coords = coords[3];
          }

          //Return object with the following pertinent info
          var goalTile = nextTile;
          goalTile.direction = correctDirection;
          goalTile.distance = distance;
          goalTile.coords = finalCoords;
          return goalTile;

          // If the tile is unoccupied, then we need to push it into our queue
        } else if (nextTile.type === 'Unoccupied') {

          queue.push([nextTile.distanceFromTop, nextTile.distanceFromLeft, direction, coords]);

          // Give the visited object another key with the value we stored earlier
          visited[key] = true;
        }
      }
    }
  }

  // If we are blocked and there is no way to get where we want to go, return false
  return false;
};

// Returns the direction of the nearest non-team diamond mine or false, if there are no diamond mines
helpers.findNearestNonTeamDiamondMine = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(mineTile) {
    if (mineTile.type === 'DiamondMine') {
      if (mineTile.owner) {
        return mineTile.owner.team !== hero.team;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }, board);

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject.direction;
};

// Returns the nearest unowned diamond mine or false, if there are no diamond mines
helpers.findNearestUnownedDiamondMine = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(mineTile) {
    if (mineTile.type === 'DiamondMine') {
      if (mineTile.owner) {
        return mineTile.owner.id !== hero.id;
      } else {
        return true;
      }
    } else {
      return false;
    }
  });

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject.direction;
};

// Returns the nearest health well or false, if there are no health wells
helpers.findNearestHealthWell = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(healthWellTile) {
    return healthWellTile.type === 'HealthWell';
  });

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject.direction;
};

// Returns the direction of the nearest enemy with lower health
// (or returns false if there are no accessible enemies that fit this description)
helpers.findNearestWeakerEnemy = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(enemyTile) {
    return enemyTile.type === 'Hero' && enemyTile.team !== hero.team && enemyTile.health < hero.health;
  });

  //Return the direction that needs to be taken to achieve the goal
  //If no weaker enemy exists, will simply return undefined, which will
  //be interpreted as "Stay" by the game object
  return pathInfoObject.direction;
};

// Returns the direction of the nearest enemy
// (or returns false if there are no accessible enemies)
helpers.findNearestEnemy = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(enemyTile) {
    return enemyTile.type === 'Hero' && enemyTile.team !== hero.team;
  });

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject.direction;
};

// Returns the direction of the nearest friendly champion
// (or returns false if there are no accessible friendly champions)
helpers.findNearestTeamMember = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(heroTile) {
    return heroTile.type === 'Hero' && heroTile.team === hero.team;
  });

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject.direction;
};

module.exports = helpers;
