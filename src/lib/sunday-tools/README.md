# Race Simulator for Uma Musume: Pretty Derby (Global version)

### Simulation Modes

**Normal Mode**

Normal mode is the default mode and is used to simulate races expecting 9 runner setups that each have their stats, aptitudes, strategies and skills, this mode is the most accurate to be used if you want to do a VS mode.

A Race instance will hold all this 9-runners enabling them to interact with each other through the game mechanics such as:

- Position keeping
- Overtake
- Spot Struggle
- Dueling
- Skill Targeting

```
# Normal Mode
# Runners interact with each other through the game mechanics.

Race Instance
  -> Runner 1
  -> Runner 2
  -> Runner 3
  -> Runner 4
  -> Runner 5
  -> Runner 6
  -> Runner 7
  -> Runner 8
  -> Runner 9
```

A Race will generate an RNG seed for itself using a master seed which will get distributed to the runners within the race.

**Compare Mode**

Compare mode is used to measure the performance of two runners on their own isolated setups.

In this mode we will create two isolated Race instances for the two runners being compared.

```
# Runner runs alone but will do RNG rolls to trigger events.

# No Pacers

Race Instance A
  -> Runner A
Race Instance B
  -> Runner B

----

# With Pacers, pacers are shared (as in cloned) between the two instances.

Race Instance A
  -> Runner A
  -> Pacer 1
Race Instance B
  -> Runner B
  -> Pacer 1
```

This assumes that they will not interact with each other and will be run independently.

For mechanics that require interactions between more runners, this mode will instead use statistically Random distributions to resolve the outcome of the skill.

The two runners will be run with the same RNG seed set from the master seed that will be passed from the Race Instance. This ensures that the two runners will have the same random events and outcomes the only different being the runners themselves.

If the runners need to be hit with debuffs, this mode will required that the debuffs are listed with their positions in the race, this removes the random element from the debuffs.

Disclaimers:

- This mode is only for comparing the amount of Bashins a runner is able to achieve in a race compared to another.
- This mode is not a VS mode, for that you should use the Normal Mode with the proper setup of runners.
