import type { AgentId, BusEvent } from '../types/bus';
import { eventBus } from '../utils/eventBus';
import { AgentBase } from './AgentBase';

export interface SwarmParticle {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  fitness: number;
  personalBest: { x: number; y: number; fitness: number };
}

export interface ConsensusProposal {
  id: string;
  proposer: AgentId;
  value: unknown;
  votes: Map<AgentId, boolean>;
  timestamp: number;
}

export class SwarmAgent extends AgentBase {
  private swarmMembers: Set<AgentId> = new Set();
  private particle: SwarmParticle;
  private globalBest: { x: number; y: number; fitness: number } = {
    x: 0,
    y: 0,
    fitness: -Infinity,
  };
  private consensusProposals: Map<string, ConsensusProposal> = new Map();
  private behaviorState:
    | 'exploring'
    | 'converging'
    | 'consensus'
    | 'dispersing' = 'exploring';

  constructor(id: AgentId, initialPosition?: { x: number; y: number }) {
    super(id);
    this.particle = {
      id: this.id,
      position: initialPosition ?? {
        x: Math.random() * 100,
        y: Math.random() * 100,
      },
      velocity: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
      fitness: 0,
      personalBest: { x: 0, y: 0, fitness: -Infinity },
    };
    this.initialize();
  }

  private initialize(): void {
    // Subscribe to swarm-specific events
    eventBus.subscribe(['AGENT_INIT', 'AGENT_MESSAGE'], event => {
      if (event.source !== this.id) {
        this.discoverSwarmMember(event.source);
      }
    });

    // Announce presence to swarm
    this.announcePresence();

    // Start behavior loop
    this.startBehaviorLoop();
  }

  protected override onMessage(event: BusEvent): void {
    switch (event.type) {
      case 'AGENT_MESSAGE':
        this.processSwarmMessage(event);
        break;
      case 'CANVAS_COMMAND':
        this.processSwarmCommand(event);
        break;
    }
  }

  private processSwarmMessage(event: BusEvent): void {
    const payload = event.payload as {
      swarmAction: string;
      particle: SwarmParticle;
      proposal: ConsensusProposal;
      proposalId: string;
      vote: boolean;
    };

    switch (payload.swarmAction) {
      case 'position_update':
        this.updateGlobalBest(payload.particle);
        break;
      case 'consensus_proposal':
        this.handleConsensusProposal(payload.proposal);
        break;
      case 'consensus_vote':
        this.handleConsensusVote(
          payload.proposalId,
          payload.vote,
          event.source
        );
        break;
      case 'behavior_change':
        this.coordinateBehaviorChange(
          payload.swarmAction as typeof this.behaviorState
        );
        break;
      case 'join_swarm':
        this.welcomeNewMember(event.source);
        break;
    }
  }

  private processSwarmCommand(event: BusEvent): void {
    const command = event.payload as { command: string; args?: unknown[] };

    switch (command.command) {
      case 'propose_consensus':
        this.proposeConsensus(command.args?.[0]);
        break;
      case 'change_behavior':
        this.changeBehavior(command.args?.[0] as typeof this.behaviorState);
        break;
      case 'optimize_towards':
        this.optimizeTowards(command.args?.[0] as { x: number; y: number });
        break;
    }
  }

  private announcePresence(): void {
    eventBus.publish({
      id: `${this.id}-join-${Date.now()}`,
      type: 'AGENT_MESSAGE',
      timestamp: Date.now(),
      source: this.id,
      payload: {
        swarmAction: 'join_swarm',
        particle: this.particle,
      },
    });
  }

  private discoverSwarmMember(agentId: AgentId): void {
    if (!this.swarmMembers.has(agentId)) {
      this.swarmMembers.add(agentId);
      console.log(`[${this.id}] Discovered swarm member: ${agentId}`);

      // Share current state with new member
      eventBus.publish({
        id: `${this.id}-state-share-${Date.now()}`,
        type: 'AGENT_MESSAGE',
        timestamp: Date.now(),
        source: this.id,
        target: agentId,
        payload: {
          swarmAction: 'position_update',
          particle: this.particle,
          globalBest: this.globalBest,
          behavior: this.behaviorState,
        },
      });
    }
  }

  private welcomeNewMember(agentId: AgentId): void {
    this.swarmMembers.add(agentId);

    // Send current swarm state to new member
    eventBus.publish({
      id: `${this.id}-welcome-${Date.now()}`,
      type: 'AGENT_MESSAGE',
      timestamp: Date.now(),
      source: this.id,
      target: agentId,
      payload: {
        swarmAction: 'swarm_state',
        swarmSize: this.swarmMembers.size,
        globalBest: this.globalBest,
        behavior: this.behaviorState,
      },
    });
  }

  private startBehaviorLoop(): void {
    setInterval(() => {
      this.updateParticle();
      this.broadcastPosition();
      this.evaluateBehaviorChange();
    }, 1000); // Update every second
  }

  private updateParticle(): void {
    switch (this.behaviorState) {
      case 'exploring':
        this.exploreSpace();
        break;
      case 'converging':
        this.convergeToGlobalBest();
        break;
      case 'consensus':
        this.maintainConsensus();
        break;
      case 'dispersing':
        this.disperseFromCrowd();
        break;
    }

    // Update fitness based on objective function
    this.particle.fitness = this.calculateFitness(this.particle.position);

    // Update personal best
    if (this.particle.fitness > this.particle.personalBest.fitness) {
      this.particle.personalBest = {
        x: this.particle.position.x,
        y: this.particle.position.y,
        fitness: this.particle.fitness,
      };
    }

    // Update global best if necessary
    if (this.particle.fitness > this.globalBest.fitness) {
      this.globalBest = {
        x: this.particle.position.x,
        y: this.particle.position.y,
        fitness: this.particle.fitness,
      };
    }

    this.updateState({
      position: this.particle.position,
      fitness: this.particle.fitness,
      behavior: this.behaviorState,
      swarmSize: this.swarmMembers.size,
    });
  }

  private exploreSpace(): void {
    // Random exploration with some momentum
    this.particle.velocity.x += (Math.random() - 0.5) * 0.5;
    this.particle.velocity.y += (Math.random() - 0.5) * 0.5;

    // Apply velocity limits
    this.particle.velocity.x = Math.max(
      -2,
      Math.min(2, this.particle.velocity.x)
    );
    this.particle.velocity.y = Math.max(
      -2,
      Math.min(2, this.particle.velocity.y)
    );

    // Update position
    this.particle.position.x += this.particle.velocity.x;
    this.particle.position.y += this.particle.velocity.y;

    // Boundary conditions
    this.particle.position.x = Math.max(
      0,
      Math.min(100, this.particle.position.x)
    );
    this.particle.position.y = Math.max(
      0,
      Math.min(100, this.particle.position.y)
    );
  }

  private convergeToGlobalBest(): void {
    // PSO (Particle Swarm Optimization) algorithm
    const w = 0.7; // Inertia weight
    const c1 = 1.5; // Cognitive parameter
    const c2 = 1.5; // Social parameter

    const r1 = Math.random();
    const r2 = Math.random();

    // Update velocity
    this.particle.velocity.x =
      w * this.particle.velocity.x +
      c1 * r1 * (this.particle.personalBest.x - this.particle.position.x) +
      c2 * r2 * (this.globalBest.x - this.particle.position.x);

    this.particle.velocity.y =
      w * this.particle.velocity.y +
      c1 * r1 * (this.particle.personalBest.y - this.particle.position.y) +
      c2 * r2 * (this.globalBest.y - this.particle.position.y);

    // Update position
    this.particle.position.x += this.particle.velocity.x;
    this.particle.position.y += this.particle.velocity.y;

    // Boundary conditions
    this.particle.position.x = Math.max(
      0,
      Math.min(100, this.particle.position.x)
    );
    this.particle.position.y = Math.max(
      0,
      Math.min(100, this.particle.position.y)
    );
  }

  private maintainConsensus(): void {
    // Stay near consensus position with small random movements
    const consensusX = this.globalBest.x;
    const consensusY = this.globalBest.y;

    this.particle.position.x +=
      (consensusX - this.particle.position.x) * 0.1 +
      (Math.random() - 0.5) * 0.2;
    this.particle.position.y +=
      (consensusY - this.particle.position.y) * 0.1 +
      (Math.random() - 0.5) * 0.2;
  }

  private disperseFromCrowd(): void {
    // Move away from crowded areas
    this.particle.velocity.x += (Math.random() - 0.5) * 2;
    this.particle.velocity.y += (Math.random() - 0.5) * 2;

    this.particle.position.x += this.particle.velocity.x;
    this.particle.position.y += this.particle.velocity.y;

    // Boundary conditions
    this.particle.position.x = Math.max(
      0,
      Math.min(100, this.particle.position.x)
    );
    this.particle.position.y = Math.max(
      0,
      Math.min(100, this.particle.position.y)
    );
  }

  private calculateFitness(position: { x: number; y: number }): number {
    // Example fitness function: distance from center with some noise
    const centerX = 50;
    const centerY = 50;
    const distance = Math.sqrt(
      Math.pow(position.x - centerX, 2) + Math.pow(position.y - centerY, 2)
    );
    return (
      100 -
      distance +
      Math.sin(position.x / 10) * 5 +
      Math.cos(position.y / 10) * 5
    );
  }

  private broadcastPosition(): void {
    eventBus.publish({
      id: `${this.id}-position-${Date.now()}`,
      type: 'AGENT_MESSAGE',
      timestamp: Date.now(),
      source: this.id,
      payload: {
        swarmAction: 'position_update',
        particle: this.particle,
      },
    });
  }

  private updateGlobalBest(particle: SwarmParticle): void {
    if (particle.fitness > this.globalBest.fitness) {
      this.globalBest = {
        x: particle.position.x,
        y: particle.position.y,
        fitness: particle.fitness,
      };
    }
  }

  private evaluateBehaviorChange(): void {
    const swarmSize = this.swarmMembers.size;

    // Simple behavior state machine
    switch (this.behaviorState) {
      case 'exploring':
        if (this.globalBest.fitness > 80 && swarmSize > 2) {
          this.changeBehavior('converging');
        }
        break;
      case 'converging':
        if (this.globalBest.fitness > 95) {
          this.changeBehavior('consensus');
        } else if (this.globalBest.fitness < 60) {
          this.changeBehavior('exploring');
        }
        break;
      case 'consensus':
        if (Math.random() < 0.05) {
          // 5% chance to start dispersing
          this.changeBehavior('dispersing');
        }
        break;
      case 'dispersing':
        if (Math.random() < 0.1) {
          // 10% chance to start exploring again
          this.changeBehavior('exploring');
        }
        break;
    }
  }

  private changeBehavior(newBehavior: typeof this.behaviorState): void {
    if (this.behaviorState !== newBehavior) {
      this.behaviorState = newBehavior;

      // Broadcast behavior change to swarm
      eventBus.publish({
        id: `${this.id}-behavior-${Date.now()}`,
        type: 'AGENT_MESSAGE',
        timestamp: Date.now(),
        source: this.id,
        payload: {
          swarmAction: 'behavior_change',
          newBehavior,
        },
      });
    }
  }

  private coordinateBehaviorChange(
    newBehavior: typeof this.behaviorState
  ): void {
    // Consider adopting the behavior change from other swarm members
    if (Math.random() < 0.7) {
      // 70% chance to follow
      this.changeBehavior(newBehavior);
    }
  }

  private proposeConsensus(value: unknown): void {
    const proposal: ConsensusProposal = {
      id: `proposal-${this.id}-${Date.now()}`,
      proposer: this.id,
      value,
      votes: new Map(),
      timestamp: Date.now(),
    };

    this.consensusProposals.set(proposal.id, proposal);

    // Broadcast proposal to swarm
    eventBus.publish({
      id: `${this.id}-consensus-proposal-${Date.now()}`,
      type: 'AGENT_MESSAGE',
      timestamp: Date.now(),
      source: this.id,
      payload: {
        swarmAction: 'consensus_proposal',
        proposal,
      },
    });
  }

  private handleConsensusProposal(proposal: ConsensusProposal): void {
    this.consensusProposals.set(proposal.id, proposal);

    // Vote on the proposal
    const vote = this.evaluateProposal(proposal);

    eventBus.publish({
      id: `${this.id}-vote-${Date.now()}`,
      type: 'AGENT_MESSAGE',
      timestamp: Date.now(),
      source: this.id,
      payload: {
        swarmAction: 'consensus_vote',
        proposalId: proposal.id,
        vote,
      },
    });
  }

  private handleConsensusVote(
    proposalId: string,
    vote: boolean,
    voter: AgentId
  ): void {
    const proposal = this.consensusProposals.get(proposalId);
    if (proposal) {
      proposal.votes.set(voter, vote);

      // Check if consensus is reached
      if (proposal.votes.size >= Math.ceil(this.swarmMembers.size * 0.6)) {
        const yesVotes = Array.from(proposal.votes.values()).filter(
          v => v
        ).length;
        const consensus = yesVotes / proposal.votes.size > 0.5;

        if (consensus) {
          this.implementConsensus(proposal);
        }
      }
    }
  }

  private evaluateProposal(_proposal: ConsensusProposal): boolean {
    // Simple evaluation logic - in reality, this would be more sophisticated
    return Math.random() > 0.3; // 70% chance to vote yes
  }

  private implementConsensus(proposal: ConsensusProposal): void {
    console.log(`[${this.id}] Consensus reached on proposal: ${proposal.id}`);

    // Implement the consensus decision
    this.remember('lastConsensus', proposal);
    this.changeBehavior('consensus');
  }

  private optimizeTowards(target: { x: number; y: number }): void {
    // Set a new optimization target
    this.globalBest = { x: target.x, y: target.y, fitness: 100 };
    this.changeBehavior('converging');
  }
}
